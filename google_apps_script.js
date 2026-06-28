/**
 * Google Apps Script Backend for FurniFlow
 * 
 * Instructions:
 * 1. Go to Google Drive (logged in as artech.mahesh@gmail.com).
 * 2. Create a new Google Sheet named "FurniFlow_Database".
 * 3. In the menu, click Extensions -> Apps Script.
 * 4. Delete any code in the editor and paste this entire code.
 * 5. Click Save (disk icon).
 * 6. Click "Deploy" (top right) -> "New deployment".
 * 7. Click the gear icon next to "Select type" and choose "Web app".
 * 8. Set the configuration:
 *    - Description: FurniFlow API
 *    - Execute as: Me (artech.mahesh@gmail.com)
 *    - Who has access: Anyone (this is required for the app to connect)
 * 9. Click "Deploy". Authorize permissions when prompted.
 * 10. Copy the "Web app URL" (it ends with /exec).
 * 11. Paste this URL into the GOOGLE_SCRIPT_URL constant at the top of your app.js file.
 */

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Ensure tables exist
  checkAndInitSheets(ss);
  
  var result = {};
  
  try {
    if (action === "getCards") {
      result = getRowsData(ss.getSheetByName("JobCards"));
      // Parse JSON strings back to arrays
      result = result.map(function(row) {
        row.items = JSON.parse(row.items || '[]');
        row.bom = JSON.parse(row.bom || '[]');
        row.tickets = JSON.parse(row.tickets || '[]');
        row.stageHistory = JSON.parse(row.stageHistory || '[]');
        row.deptHistory = JSON.parse(row.deptHistory || '[]');
        return row;
      });
    } else if (action === "getMats") {
      result = getRowsData(ss.getSheetByName("Materials"));
    } else if (action === "getUsers") {
      result = getRowsData(ss.getSheetByName("Users"));
    } else {
      throw new Error("Invalid action: " + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  checkAndInitSheets(ss);
  
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var result = { success: true };
    
    if (action === "setCards") {
      var sheet = ss.getSheetByName("JobCards");
      sheet.clearContents();
      
      var cards = postData.data;
      if (cards.length > 0) {
        var headers = ["id", "projectName", "clientName", "poNo", "poDate", "jobCardDate", "dispatchDate", "artNo", "stage", "stageColor", "stagePercent", "createdBy", "createdAt", "prodType", "currentDept", "currentDeptStatus", "qcStatus", "items", "bom", "tickets", "stageHistory", "deptHistory"];
        sheet.appendRow(headers);
        
        cards.forEach(function(c) {
          var row = [
            c.id || "",
            c.projectName || "",
            c.clientName || "",
            c.poNo || "",
            c.poDate || "",
            c.jobCardDate || "",
            c.dispatchDate || "",
            c.artNo || "",
            c.stage || "",
            c.stageColor || "",
            c.stagePercent || 0,
            c.createdBy || "",
            c.createdAt || Date.now(),
            c.prodType || "",
            c.currentDept || "",
            c.currentDeptStatus || "",
            c.qcStatus || "",
            JSON.stringify(c.items || []),
            JSON.stringify(c.bom || []),
            JSON.stringify(c.tickets || []),
            JSON.stringify(c.stageHistory || []),
            JSON.stringify(c.deptHistory || [])
          ];
          sheet.appendRow(row);
        });
      } else {
        var headers = ["id", "projectName", "clientName", "poNo", "poDate", "jobCardDate", "dispatchDate", "artNo", "stage", "stageColor", "stagePercent", "createdBy", "createdAt", "prodType", "currentDept", "currentDeptStatus", "qcStatus", "items", "bom", "tickets", "stageHistory", "deptHistory"];
        sheet.appendRow(headers);
      }
    } else if (action === "setMats") {
      var sheet = ss.getSheetByName("Materials");
      sheet.clearContents();
      var mats = postData.data;
      var headers = ["cat", "brand", "material", "unit", "stock", "rate", "status"];
      sheet.appendRow(headers);
      mats.forEach(function(m) {
        sheet.appendRow([m.cat||"", m.brand||"", m.material||"", m.unit||"", m.stock||0, m.rate||0, m.status||""]);
      });
    } else if (action === "setUsers") {
      var sheet = ss.getSheetByName("Users");
      sheet.clearContents();
      var users = postData.data;
      var headers = ["id", "username", "password", "role"];
      sheet.appendRow(headers);
      users.forEach(function(u) {
        sheet.appendRow([u.id||"", u.username||"", u.password||"", u.role||""]);
      });
    } else {
      throw new Error("Invalid post action: " + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function checkAndInitSheets(ss) {
  var sheets = ["JobCards", "Materials", "Users"];
  sheets.forEach(function(shName) {
    var sh = ss.getSheetByName(shName);
    if (!sh) {
      sh = ss.insertSheet(shName);
      if (shName === "JobCards") {
        sh.appendRow(["id", "projectName", "clientName", "poNo", "poDate", "jobCardDate", "dispatchDate", "artNo", "stage", "stageColor", "stagePercent", "createdBy", "createdAt", "prodType", "currentDept", "currentDeptStatus", "qcStatus", "items", "bom", "tickets", "stageHistory", "deptHistory"]);
      } else if (shName === "Materials") {
        sh.appendRow(["cat", "brand", "material", "unit", "stock", "rate", "status"]);
      } else if (shName === "Users") {
        sh.appendRow(["id", "username", "password", "role"]);
      }
    }
  });
}

function getRowsData(sheet) {
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var objects = [];
  
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    objects.push(obj);
  }
  return objects;
}
