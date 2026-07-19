"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AnnouncementType } from "@/lib/types/database";

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function addAnnouncement(text: string, type: AnnouncementType, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .insert({ text, type, is_active: isActive });
  if (error) throw new Error(error.message);
  refresh();
}

export async function toggleAnnouncement(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function addPhotoRecord(url: string, caption: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("guest_photos")
    .insert({ url, caption, is_approved: true });
  if (error) throw new Error(error.message);
  refresh();
}

export async function deletePhotoRecord(id: string, urlPath: string) {
  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("guest_photos")
    .delete()
    .eq("id", id);
  if (dbError) throw new Error(dbError.message);

  // Extract filename from URL (e.g. "https://domain.com/storage/v1/object/public/photos/file.jpg")
  const parts = urlPath.split("/");
  const fileName = parts[parts.length - 1];
  if (fileName) {
    const { error: storageError } = await supabase.storage
      .from("photos")
      .remove([fileName]);
    if (storageError) {
      console.error("Storage clean up failed:", storageError.message);
    }
  }
  
  refresh();
}
