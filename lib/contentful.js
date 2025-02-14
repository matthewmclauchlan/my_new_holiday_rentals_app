// lib/contentful.js
import { createClient } from 'contentful';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;
if (!extra) {
  throw new Error("Missing environment variables in expo config (extra)");
}

console.log("Contentful Config:", {
  space: extra.NEXT_PUBLIC_SPACE_ID,
  environment: extra.NEXT_PUBLIC_ENVIRONMENT,
  accessToken: extra.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN,
});

const isPreview = false; // Change to true if you want to use the preview API

const client = createClient({
  space: extra.NEXT_PUBLIC_SPACE_ID,
  environment: extra.NEXT_PUBLIC_ENVIRONMENT || 'master',
  accessToken: isPreview
    ? extra.NEXT_PUBLIC_CONTENTFUL_PREVIEW_ACCESS_TOKEN
    : extra.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN,
  host: isPreview ? 'preview.contentful.com' : 'cdn.contentful.com',
});

export default client;
