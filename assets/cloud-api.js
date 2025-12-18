var CloudApi = (function () {

    var APP_NAME = 'cartogram-japan';
    var BUCKET_NAME = 'user_projects';

    // Helper to get configuration and session
    // dataviz-auth-client.js が window.supabase を初期化している前提
    async function getSupabaseConfig() {
        var globalAuthClient = window.supabase;
        if (!globalAuthClient || !globalAuthClient.auth) {
            throw new Error("認証クライアントが読み込まれていません。ページをリロードしてください。");
        }

        var sessionResponse = await globalAuthClient.auth.getSession();
        var session = sessionResponse.data.session;
        var sessionError = sessionResponse.error;

        if (sessionError || !session || !session.user) {
            console.warn("Session check failed:", sessionError);
            throw new Error("ログインしてください。");
        }

        var supabaseUrl = "https://vebhoeiltxspsurqoxvl.supabase.co"; // 固定値 or 環境変数
        // dataviz-auth-client.js で使われているキー取得を試みるが、クライアントインスタンスからは直接取れない場合がある。
        // その場合はハードコードが必要だが、今回はクライアントが持っていると仮定、あるいは参照元の実装に合わせてハードコード。
        // 参照元の cloudApi.js にあったキーを使用。
        var supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlYmhvZWlsdHhzcHN1cnFveHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNTY4MjMsImV4cCI6MjA4MDYzMjgyM30.5uf-D07Hb0JxL39X9yQ20P-5gFc1CRMdKWhDySrNZ0E";

        return {
            supabaseUrl: supabaseUrl,
            supabaseKey: supabaseKey,
            accessToken: session.access_token,
            user: session.user
        };
    }

    async function getProjects() {
        console.log("Fetching projects...");
        try {
            var config = await getSupabaseConfig();
            var endpoint = config.supabaseUrl + "/rest/v1/projects?select=id,name,created_at,updated_at,thumbnail_path&app_name=eq." + APP_NAME + "&order=updated_at.desc&apikey=" + config.supabaseKey;

            var response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error("Projects fetch failed: " + response.status);
            }

            var data = await response.json();
            return data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    // UUID generation helper (for older browsers compatibility if needed)
    function generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async function saveProject(projectData, projectName, thumbnailBlob) {
        console.log("Saving project...");
        try {
            var config = await getSupabaseConfig();
            var id = projectData.id || generateUUID();
            var now = new Date().toISOString();
            var jsonFilePath = config.user.id + "/" + id + ".json";
            var thumbFilePath = config.user.id + "/" + id + ".png";

            // 1. Upload JSON to Storage
            var jsonEndpoint = config.supabaseUrl + "/storage/v1/object/" + BUCKET_NAME + "/" + jsonFilePath + "?apikey=" + config.supabaseKey;
            var jsonResponse = await fetch(jsonEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + config.accessToken,
                    'Content-Type': 'application/json',
                    'x-upsert': 'true'
                },
                body: JSON.stringify(projectData)
            });

            if (!jsonResponse.ok) {
                throw new Error("Storage upload failed: " + jsonResponse.status);
            }

            // 2. Upload Thumbnail (Optional)
            if (thumbnailBlob) {
                var thumbEndpoint = config.supabaseUrl + "/storage/v1/object/" + BUCKET_NAME + "/" + thumbFilePath + "?apikey=" + config.supabaseKey;
                await fetch(thumbEndpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + config.accessToken,
                        'Content-Type': 'image/png',
                        'x-upsert': 'true'
                    },
                    body: thumbnailBlob
                });
            }

            // 3. Save Metadata to DB
            var payload = {
                id: id,
                user_id: config.user.id,
                name: projectName || 'Untitled Project',
                storage_path: jsonFilePath,
                thumbnail_path: thumbnailBlob ? thumbFilePath : null,
                app_name: APP_NAME,
                created_at: projectData.created_at || now,
                updated_at: now
            };

            var dbEndpoint = config.supabaseUrl + "/rest/v1/projects?apikey=" + config.supabaseKey;
            var dbResponse = await fetch(dbEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates,return=representation'
                },
                body: JSON.stringify(payload)
            });

            if (!dbResponse.ok) {
                throw new Error("DB save failed: " + dbResponse.status);
            }

            var result = await dbResponse.json();
            return result && result.length > 0 ? result[0] : null;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function loadProject(projectId) {
        console.log("Loading project: " + projectId);
        try {
            var config = await getSupabaseConfig();

            // 1. Get storage path from DB
            var dbEndpoint = config.supabaseUrl + "/rest/v1/projects?select=storage_path&id=eq." + projectId + "&apikey=" + config.supabaseKey;
            var dbResponse = await fetch(dbEndpoint, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!dbResponse.ok) throw new Error("DB fetch failed: " + dbResponse.status);
            var rows = await dbResponse.json();
            if (!rows.length) throw new Error("Project not found");

            var storagePath = rows[0].storage_path;

            // 2. Download from Storage
            var storageEndpoint = config.supabaseUrl + "/storage/v1/object/" + BUCKET_NAME + "/" + storagePath + "?apikey=" + config.supabaseKey;
            var storageResponse = await fetch(storageEndpoint, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + config.accessToken
                }
            });

            if (!storageResponse.ok) throw new Error("Storage download failed: " + storageResponse.status);

            return await storageResponse.json();
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function deleteProject(projectId) {
        // 必要な場合は実装
        console.log("Delete not implemented in this minimal version.");
    }

    return {
        getProjects: getProjects,
        saveProject: saveProject,
        loadProject: loadProject,
        deleteProject: deleteProject
    };

})();
