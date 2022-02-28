export const APP_PORT = process.env.PORT || 3000;
export const BASE_URL = 'https://www.instagram.com/';
export const AUTH_URL = BASE_URL + 'accounts/login/ajax/'; 
export const CHROME_WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36'
export const STORIES_UA = 'Instagram 123.0.0.21.114 (iPhone; CPU iPhone OS 11_4 like Mac OS X; en_US; en-US; scale=2.00; 750x1334) AppleWebKit/605.1.15'
export const MEDIA_QUERY_URL = BASE_URL + `graphql/query/?query_hash=42323d64886122307be10013ad2dcc44&variables=`;
export const MEDIA_QUERY_VAR = `{"id":"{id}","first":{pagesize},"after":"{next}"}`;
export const VIEW_MEDIA_URL = 'https://www.instagram.com/p/{code}/?__a=1';
export const VIEW_MEDIA_CONCURRENT = 2;
export const USER_INFO_URL = BASE_URL + '{username}/?__a=1'
export const PAGE_SIZE = 50;
