use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Receipt {
    id: String,
    total: f64,
    payment: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HardwareStatus {
    mode: &'static str,
    printer: &'static str,
    cash_drawer: &'static str,
    scanner: &'static str,
}

#[tauri::command]
fn print_receipt(receipt: Receipt) -> Result<String, String> {
    // Production printer drivers implement ESC/POS or the operating-system spooler here.
    Ok(format!(
        "Receipt {} queued: {:.2} paid by {}",
        receipt.id, receipt.total, receipt.payment
    ))
}

#[tauri::command]
fn open_cash_drawer() -> Result<(), String> {
    Err("No cash-drawer driver is configured for this terminal.".into())
}

#[tauri::command]
fn device_status() -> HardwareStatus {
    HardwareStatus {
        mode: "desktop",
        printer: "driver-required",
        cash_drawer: "driver-required",
        scanner: "keyboard-wedge",
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_, _, _| {}))
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            print_receipt,
            open_cash_drawer,
            device_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nexora POS desktop");
}
