<template>
  <div class="container">
    <div class="mx-3">
      <h1 class="font-bold">Google Drive</h1>
      <hr>
      <ul>
        <li class="p-1 border-b"
            :class="googleAuthButtonActive ? 'cursor-pointer' : 'text-gray-600 cursor-not-allowed'"
            @click="handleAuthClick">
          <p>{{ $t('cloud.auth') }}</p>
          <p class="text-sm text-gray-700">{{ $t(`cloud.auth-description`, {provider: 'Google Drive'}) }}</p>
        </li>
        <li class="p-1 border-b"
            :class="googleOutButtonActive ? 'cursor-pointer' : 'text-gray-600 cursor-not-allowed'"
            @click="handleSignoutClick">
          <p>{{ $t('cloud.cancel') }}</p>
          <p class="text-sm text-gray-700">{{ $t(`cloud.cancel-description`) }}</p>
        </li>

      </ul>
      <h1 class="font-bold mt-3">{{ $t('pages.cloud') }}</h1>
      <hr>
      <ul>
        <li class="p-1 border-b"
            :class="googleOutButtonActive ? 'cursor-pointer' : 'text-gray-600 cursor-not-allowed'"
            @click="syncImport">
          <p>{{ $t('cloud.sync-import') }}</p>
          <p class="text-sm text-gray-700">{{ $t(`cloud.sync-import-description`) }}</p>
        </li>
        <li class="p-1 border-b"
            :class="googleOutButtonActive ? 'cursor-pointer' : 'text-gray-600 cursor-not-allowed'"
            @click="syncExport">
          <p>{{ $t('cloud.sync-export') }}</p>
          <p class="text-sm text-gray-700">{{ $t(`cloud.sync-export-description`) }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

const GOOGLE_CLIENT_ID = `886779756999-hkkb0ac5k9fsdc7p427fhng6o9ilck30.apps.googleusercontent.com`;
// const GOOGLE_CLIENT_SECRET = `0oncDCM584DQiksxlCnhU3kY`;
const GOOGLE_API_KEY = `REDACTED_GOOGLE_API_KEY`;
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
// const SCOPES = ;
const SCOPES = [
  // 'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.appdata'
].join(' ');

var auth = function (immediate: boolean) {
  //@ts-ignore
  return gapi.auth.authorize({
    'client_id': 'YOUR CLIENT ID GOES HERE',
    // Permissions here can be more restrictive
    scope: 'https://www.googleapis.com/auth/drive',
    immediate: immediate
  });
};

var silentAuth = function () {
  return auth(true);
};

var popupAuth = function () {
  return auth(false);
};

var loadDriveAPI = function () {
  return global.gapi.client.load('drive', 'v3');
};

const getAppDataFileId = async (): Promise<string> => {
  //@ts-ignore
  return gapi.client.drive.files
    .list({
      q: 'name="your-app-data-file-name.json"',
      spaces: 'appDataFolder',
      fields: 'files(id)'
    }).then(
      function (data: any) {
        if (data.result.files.length === 0) {
          return '';
        }
        return data.result.files[0].id
      }
    );
};

const createAppDataFile = async (): Promise<string> => {
  //@ts-ignore
  return gapi.client.drive.files
    .create({
      resource: {
        name: 'your-app-data-file-name.json',
        parents: ['appDataFolder']
      },
      fields: 'id'
    }).then(function (data: any) {
      return data.result.id;
    });
};

const getAppDataFileContent = async (fileId: string): Promise<{ fileId: string, appData: string }> => {
  //@ts-ignore
  return gapi.client.drive.files
    .get({
      fileId: fileId,
      // Download a file — files.get with alt=media file resource
      alt: 'media'
    }).then((data: { body: string }) => {
      console.log(data);
      return {
        fileId: fileId,
        appData: data?.body
      };
    });
}

const saveAppData = async (fileId: string, appData: string): Promise<any> => {
  return gapi.client.request({
    path: '/upload/drive/v3/files/' + fileId,
    method: 'PATCH',
    params: {
      uploadType: 'media'
    },
    body: appData
  });
};


export default Vue.extend({
  name: "index",
  data() {
    return {
      googleAuthButtonActive: false,
      googleOutButtonActive: false
    }
  },
  head: {
    script: [
      {
        src: 'https://apis.google.com/js/api.js',
        async: true,
        defer: true,
        onload: "() => { console.log(this); }"
      }
    ]
  },
  methods: {
    handleAuthClick() {
      if (this.googleAuthButtonActive) {
        //@ts-ignore
        gapi.auth2.getAuthInstance().signIn();
      }
    },
    handleSignoutClick() {
      if (this.googleOutButtonActive) {
        //@ts-ignore
        gapi.auth2.getAuthInstance().signOut();
      }
    },
    updateSigninStatus(isSignedIn: boolean) {
      console.log('updateSigninStatus', isSignedIn, this);
      if (isSignedIn) {
        this.googleOutButtonActive = true;
        this.googleAuthButtonActive = false;
      } else {
        this.googleAuthButtonActive = true;
        this.googleOutButtonActive = false;
      }
    },
    async syncImport() {
      let fileId = await getAppDataFileId()
      if(!fileId) {
        console.log("NO FILE");
        return;
      }
      const data = await getAppDataFileContent(fileId);
      console.log(data);
      return this.$store.dispatch('database/import', data.appData)
    },
    async syncExport() {
      let fileId = await getAppDataFileId()
      if (!fileId) {
        fileId = await createAppDataFile();
      }
      console.log(fileId);
      return  saveAppData(fileId, this.$store.getters.databaseText);

    },
  },
  mounted() {
    console.log("mounted");
    const self = this;
    //@ts-ignore
    window.onGapiLoad = () => {
      console.log("onGapiLoad");
      const onAuthApiLoad = async () => {
        console.log("onAuthApiLoad");
        //@ts-ignore
        const init = await new Promise((resolve: () => void, reject) => {
          setTimeout(resolve, 15000);
          //@ts-ignore
          gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            clientId: GOOGLE_CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
          }).then(resolve, reject);
        })

        console.log("then");
        // Listen for sign-in state changes.
        //@ts-ignore
        gapi.auth2.getAuthInstance().isSignedIn.listen(self.updateSigninStatus);

        // Handle the initial sign-in state.
        //@ts-ignore
        self.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());

      }

      gapi.load('client:auth2', onAuthApiLoad)
    }

    const ID = 'apis-google-com-js-api-js';

    if (!document.querySelector(`#${ID}`)) {
      const gapiScript = document.createElement('script')
      gapiScript.id = ID;
      gapiScript.src = 'https://apis.google.com/js/api.js?onload=onGapiLoad'
      document.body.appendChild(gapiScript)
    } else {
      //@ts-ignore
      window.onGapiLoad();
    }
  }
})
</script>

<style scoped>

</style>

