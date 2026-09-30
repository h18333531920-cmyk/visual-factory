import { handleAccess } from '../_account-access.js';
export const onRequest = ({ request, env }) => handleAccess(request, env);
