

import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore

# --- Firebase Setup ---
cred = credentials.Certificate("/Users/chloeh/Downloads/social-work-placement-firebase-adminsdk-fbsvc-403b614764.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# --- Excel File Path ---
excel_path = "/Users/chloeh/Downloads/SAMPE DATA_TEST ONLY.xlsx"

# --- Upload: Sectors ---
df_sectors = pd.read_excel(excel_path, sheet_name="Sectors", header=None)
df_sectors.columns = ["sector"]
for i, row in df_sectors.iterrows():
    db.collection("sectors").document(f"sector_{i}").set(row.to_dict())
print("✅ Uploaded 'Sectors'")

# --- Upload: FE1 Students ---
df_fe1 = pd.read_excel(excel_path, sheet_name="FE1 students", skiprows=2)
df_fe1 = df_fe1.dropna(subset=["Name"])  # remove empty rows
for i, row in df_fe1.iterrows():
    db.collection("fe1_students").document(f"fe1_{i}").set(row.to_dict())
print("✅ Uploaded 'FE1 students'")

# --- Upload: FE2 Students ---
df_fe2 = pd.read_excel(excel_path, sheet_name="FE2 students", skiprows=2)
df_fe2 = df_fe2.dropna(subset=["Name"])
for i, row in df_fe2.iterrows():
    db.collection("fe2_students").document(f"fe2_{i}").set(row.to_dict())
print("✅ Uploaded 'FE2 students'")

# --- Upload: Agencies ---
df_agency = pd.read_excel(excel_path, sheet_name="Agency", skiprows=2)
df_agency = df_agency.dropna(subset=["Name"])
for i, row in df_agency.iterrows():
    db.collection("agencies").document(f"agency_{i}").set(row.to_dict())
print("✅ Uploaded 'Agency'")

# --- Upload: UWA Sessional Staff ---
df_staff = pd.read_excel(excel_path, sheet_name="UWA Sessional Staff")
df_staff = df_staff.dropna(subset=["Name"])
for i, row in df_staff.iterrows():
    db.collection("uwa_sessional_staff").document(f"staff_{i}").set(row.to_dict())
print("✅ Uploaded 'UWA Sessional Staff'")

print("🎉 All data uploaded to Firestore!")
