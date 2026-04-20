/** Supabase Storage bucket for slide images (see supabase/migrations/*_storage_slide_assets.sql). */
export const SLIDE_ASSETS_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "slide-assets";
