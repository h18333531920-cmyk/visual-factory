import {defineConfig} from 'vite';
export default defineConfig({plugins:[{name:'main-site-account-guard',transformIndexHtml(html){return html.replace('</head>','<script src="/config.js"></script><script src="/tool-auth-guard.js?v=20260915-account-access-v541"></script></head>');}}],base:'/tools/icons/',build:{outDir:'../../tools/icons',emptyOutDir:true}});
