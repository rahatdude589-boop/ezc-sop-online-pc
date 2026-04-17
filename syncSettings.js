// =====================================================
// SETTINGS SYNC SYSTEM (CLEAN VERSION - NO INDEXEDDB)
// =====================================================

console.log("SETTINGS SYNC LOADED");

// ---------------------------------
// CLOUD → LOCAL (RESTORE)
// ---------------------------------
window.restoreSettings = async function () {
  if (!navigator.onLine) return;

  console.log("SETTINGS RESTORE START");

  const { data, error } = await supabaseClient
    .from("settings")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (error || !data) return;

  localStorage.setItem("SHOP_NAME", data.shop_name || "");
  localStorage.setItem("SHOP_PHONE", data.shop_phone || "");
  localStorage.setItem("SHOP_ADDRESS", data.shop_address || "");
  localStorage.setItem("SALE_COMMENT", data.sale_comment || "");

  console.log("SETTINGS RESTORED");
};


// ---------------------------------
// LOCAL → CLOUD (UPLOAD)
// ---------------------------------
/* window.syncSettings = async function () {
  if (!navigator.onLine) return;

  console.log("SETTINGS SYNC START");

  await supabaseClient
    .from("settings")
    .upsert({
      user_id: USER_ID,
      shop_name: localStorage.getItem("SHOP_NAME") || "",
      shop_phone: localStorage.getItem("SHOP_PHONE") || "",
      shop_address: localStorage.getItem("SHOP_ADDRESS") || "",
      sale_comment: localStorage.getItem("SALE_COMMENT") || "",
      last_updated: new Date().toISOString()
    }, {
      onConflict: "user_id"
    });

  console.log("SETTINGS UPLOADED");
};   */
window.syncSettings = async function () {
  if (!navigator.onLine) return;

  console.log("SETTINGS SYNC START");

  const { data, error } = await supabaseClient
  .from("settings")
  .upsert({
    user_id: USER_ID,
    shop_name: localStorage.getItem("SHOP_NAME") || "",
    shop_phone: localStorage.getItem("SHOP_PHONE") || "",
    shop_address: localStorage.getItem("SHOP_ADDRESS") || "",
    sale_comment: localStorage.getItem("SALE_COMMENT") || "",
    last_updated: new Date().toISOString()
  }, {
    onConflict: "user_id"
  })
  .select(); // 🔥 ADD THIS
  
  if (error) {
    console.error("❌ SETTINGS SYNC ERROR:", error);
  } else {
    console.log("✅ SETTINGS UPLOADED:", data);
  }
};

// ---------------------------------
// UI SAVE HELPER
// ---------------------------------
window.syncSettingsFromUI = async function () {
  await syncSettings(); // just upload latest localStorage
}; 