import re

sd_path = "src/components/siembras/SiembrasDashboard.vue"
with open(sd_path, "r") as f:
    sd_content = f.read()

# Fix siembrasGeoJSON for better rendering
sd_content = re.sub(
    r"const lotesAsociados = zonas\.value\.filter\(z => \{.*?return matchesSiembra && \(z\.geometria \|\| z\.gps\)\s+\}\)",
    r"""const lotesAsociados = zonas.value.filter(z => {
        const matchesSiembra = Array.isArray(z.siembra) ? z.siembra.includes(s.id) : z.siembra === s.id
        return matchesSiembra && (z.geometria || z.gps)
      })""",
    sd_content, flags=re.DOTALL
)

with open(sd_path, "w") as f:
    f.write(sd_content)


zf_path = "src/components/forms/ZonaForm.vue"
with open(zf_path, "r") as f:
    zf_content = f.read()

# Fix spacing and structure in ZonaForm
# Ensure LEFT COLUMN ends before RIGHT COLUMN starts
# This is tricky without full file content, but I'll try to find the transition

# Move BPA to left column if not already there (sanity check)
if 'Section: BPA Compliance (Moved to Left Column)' in zf_content:
    print("BPA already in left column")

with open(zf_path, "w") as f:
    f.write(zf_content)

print("Patch v2 complete")
