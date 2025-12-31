var CloudApi = (function () {

    var APP_NAME = 'cartogram-japan';
    var BUCKET_NAME = 'user_projects';

    // Helper to get configuration and session
    // dataviz-auth-client.js が window.datavizSupabase を初期化している前提
    async function getSupabaseConfig() {
        var globalAuthClient = window.datavizSupabase;
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

            // Fetch projects from API
            var apiEndpoint = config.supabaseUrl.replace('vebhoeiltxspsurqoxvl.supabase.co', 'api.dataviz.jp') + '/api/projects?app=' + APP_NAME;
            var response = await fetch(apiEndpoint, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + config.accessToken,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                var errorData = await response.json().catch(function () { return {}; });
                throw new Error("API fetch failed: " + response.status + " - " + (errorData.error || errorData.detail || ''));
            }

            var data = await response.json();
            // API returns { "projects": [...] } format
            return data.projects || data;
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

    // Convert Blob to Base64 Data URI
    function blobToBase64DataUri(blob) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onloadend = function () {
                resolve(reader.result); // "data:image/png;base64,..."
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function saveProject(projectData, projectName, thumbnailBlob) {
        console.log("Saving project...");
        try {
            var config = await getSupabaseConfig();
            var id = projectData.id || generateUUID();

            // Convert thumbnail Blob to Base64 Data URI if provided
            var thumbnailDataUri = null;
            if (thumbnailBlob) {
                thumbnailDataUri = await blobToBase64DataUri(thumbnailBlob);
            }

            // Prepare API request payload
            var payload = {
                name: projectName || 'Untitled Project',
                app_name: APP_NAME,
                data: projectData,
                thumbnail: thumbnailDataUri
            };

            // If updating existing project, include ID
            if (projectData.id) {
                payload.id = projectData.id;
            }

            // Send to API endpoint
            var apiEndpoint = config.supabaseUrl.replace('vebhoeiltxspsurqoxvl.supabase.co', 'api.dataviz.jp') + '/api/projects';
            var apiResponse = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + config.accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!apiResponse.ok) {
                var errorData = await apiResponse.json().catch(function () { return {}; });
                throw new Error("API save failed: " + apiResponse.status + " - " + (errorData.error || errorData.detail || ''));
            }

            var result = await apiResponse.json();
            return result.project || result;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function loadProject(projectId) {
        console.log("Loading project: " + projectId);
        try {
            var config = await getSupabaseConfig();

            // Fetch project data from API
            var apiEndpoint = config.supabaseUrl.replace('vebhoeiltxspsurqoxvl.supabase.co', 'api.dataviz.jp') + '/api/projects/' + projectId;
            var apiResponse = await fetch(apiEndpoint, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + config.accessToken,
                    'Content-Type': 'application/json'
                }
            });

            if (!apiResponse.ok) {
                var errorData = await apiResponse.json().catch(function () { return {}; });
                throw new Error("API load failed: " + apiResponse.status + " - " + (errorData.error || errorData.detail || ''));
            }

            // API returns the project data directly
            return await apiResponse.json();
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function deleteProject(projectId) {
        // 必要な場合は実装
        console.log("Delete not implemented in this minimal version.");
    }

    async function getThumbnail(projectId) {
        console.log("Fetching thumbnail for project: " + projectId);
        try {
            var config = await getSupabaseConfig();

            // Fetch thumbnail from API
            var apiEndpoint = config.supabaseUrl.replace('vebhoeiltxspsurqoxvl.supabase.co', 'api.dataviz.jp') + '/api/projects/' + projectId + '/thumbnail';
            var response = await fetch(apiEndpoint, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + config.accessToken
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.log("No thumbnail found for project: " + projectId);
                    return null; // サムネイルなし
                }
                throw new Error("Thumbnail fetch failed: " + response.status);
            }

            // Return the image blob
            return await response.blob();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    return {
        getProjects: getProjects,
        saveProject: saveProject,
        loadProject: loadProject,
        deleteProject: deleteProject,
        getThumbnail: getThumbnail
    };

})();
