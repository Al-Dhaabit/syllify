const GAPI_SCRIPT = 'https://apis.google.com/js/api.js';
const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';

// NOTE: You must replace this with your own Client ID from the Google Cloud Console
// https://console.cloud.google.com/apis/credentials
export const GOOGLE_CLIENT_ID = '504069808538-2sf68mkie54dt8kfrjbp7nt1dmeo5pf3.apps.googleusercontent.com';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient;
let gapiInited = false;
let gisInited = false;

export function loadGoogleScripts(onLoad) {
    const script1 = document.createElement('script');
    script1.src = GAPI_SCRIPT;
    script1.async = true;
    script1.defer = true;
    script1.onload = () => {
        window.gapi.load('client', async () => {
            await window.gapi.client.init({
                // apiKey: API_KEY, // Optional for this flow
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
            if (gisInited) onLoad();
        });
    };
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = GIS_SCRIPT;
    script2.async = true;
    script2.defer = true;
    script2.onload = () => {
        gisInited = true;
        if (gapiInited) onLoad();
    };
    document.body.appendChild(script2);
}

export function initTokenClient(callback) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
            if (resp.error !== undefined) {
                throw (resp);
            }
            callback(resp);
        },
    });
}

export function getTokenClient() {
    return tokenClient;
}

export async function createCalendarEvent(event) {
    try {
        return await window.gapi.client.calendar.events.insert({
            'calendarId': 'primary',
            'resource': event,
        });
    } catch (err) {
        console.error('Error creating event', err);
        throw err;
    }
}
