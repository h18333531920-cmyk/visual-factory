-- 物料语言（英语 / 阿拉伯语）
-- 用途：案例库项目展示页的 EN / AR 筛选。文件名里有 en/ar 线索的照旧按文件名判断；
--      没有线索的由 AI 看图识别，识别不出或人工选「无」时留空/记 none —— 这类图在 EN、AR 两个
--      筛选下都会显示出来（不藏图）。
-- 前端在列不存在时自动降级（只按文件名判断），所以这条 SQL 跑完刷新页面即可生效，不影响其它功能。
alter table public.vf_asset_previews
  add column if not exists language text not null default '';

comment on column public.vf_asset_previews.language is
  'en/ar/none/空：物料语言（手改或 AI 识别）；空＝没判过，按文件名里的 en/ar 兜底';
