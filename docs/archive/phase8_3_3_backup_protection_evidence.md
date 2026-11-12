# PHASE 8.3.3 – BACKUP PROTECTION IMPLEMENTATION & EVIDENCE
## Shivneri Classic Apartment – A Wing (Panchavati, Nashik – 422003)

---

### Executive Summary & Review Scope

| Audit Dimension | Specification | Actual Forensic / Implementation State |
| :--- | :--- | :---: |
| **Project Target** | Shivneri Classic Apartment – A Wing | Verified |
| **Phase Focus** | Backup Protection Implementation & Hardware Forensics | **100% Implemented & Verified** |
| **Execution Mode** | Safe Filesystem Operations ONLY (Zero DB Writes) | **STRICTLY ENFORCED** |
| **Production Database** | `shivneri_classic_admin_db` (MongoDB localhost:27017) | **Inspected Live (0 mutations)** |
| **Primary Backup Archive** | `D:\Shivneri Classic App\backups\prelaunch_20261104_090827\` | **8,666 bytes, SHA256 Verified** |
| **Primary Read-Only Flag** | Windows filesystem attribute (`+R`) | **APPLIED & VERIFIED (`IsReadOnly: True`)** |
| **ACL Safety Assessment** | Evaluation of NTFS DENY rules vs admin recovery | **DENY Rules Excluded (Lockout Risk Avoided)** |
| **Physical Disk Hardware** | Inventory of all physical drives and volumes | **2 Disks Identified (1 SSD + 1 HDD)** |
| **Secondary Backup Drive** | Genuinely separate physical disk (`PHYSICALDRIVE1` SSD) | **`C:\Users\mahes\Shivneri_Backups_Secondary\`** |
| **Secondary Archive Hash** | SHA256 computation against primary checksum | **100% Exact Parity (`dda99092...`)** |
| **Secondary Read-Only Flag** | Windows filesystem attribute (`+R`) on secondary copy | **APPLIED & VERIFIED (`IsReadOnly: True`)** |
| **"Offline" Backup Status** | True external/air-gapped media presence | **NOT Available (Limitation Formally Reported)** |
| **Database Mutations** | Deletions, modifications, resets, or writes | **STRICTLY ZERO** |
| **Cleanup Execution** | Production pre-launch cleanup script execution | **STRICTLY NOT EXECUTED** |
| **Phase 9 Go-Live** | Production deployment activities | **STRICTLY NOT STARTED** |

---

## 1. TASK 1 – Primary Backup Protection Implementation

### 1.1 Physical Verification of Primary Archive and Checksum

Prior to executing any protection commands, the primary backup files created in Phase 8.3 were re-inspected on disk:

```powershell
# File Identity & Allocation
Archive Path     : D:\Shivneri Classic App\backups\prelaunch_20261104_090827\shivneri_classic_admin_db_backup.gz
File Size        : 8,666 bytes (exact match)
Creation / Write : 04-11-2026 09:08:28

Checksum Path    : D:\Shivneri Classic App\backups\prelaunch_20261104_090827\checksum.sha256
File Size        : 102 bytes
Creation / Write : 04-11-2026 09:08:28

Summary Path     : D:\Shivneri Classic App\backups\prelaunch_20261104_090827\verification_summary.json
File Size        : 15,987 bytes
Creation / Write : 04-11-2026 09:08:33
```

#### Cryptographic Checksum Validation
- **Reference Checksum (in `checksum.sha256`)**:
  `dda990926ac61ae830a6e8f81a56c54214243f6080b50ee7ef4e9b3549b9f1ec  shivneri_classic_admin_db_backup.gz`
- **Recomputed SHA256 via `Get-FileHash`**:
  `DDA990926AC61AE830A6E8F81A56C54214243F6080B50EE7EF4E9B3549B9F1EC`
- **Result**: **100% Exact Character-for-Character Match**. The primary archive has remained unaltered since its creation.

---

### 1.2 Application of the Windows Read-Only Attribute

The Windows Read-Only filesystem attribute (`+R`) was applied to all primary backup artifacts using PowerShell `Set-ItemProperty`:

```powershell
Set-ItemProperty -Path "D:\Shivneri Classic App\backups\prelaunch_20261104_090827\shivneri_classic_admin_db_backup.gz" -Name IsReadOnly -Value $true
Set-ItemProperty -Path "D:\Shivneri Classic App\backups\prelaunch_20261104_090827\checksum.sha256" -Name IsReadOnly -Value $true
Set-ItemProperty -Path "D:\Shivneri Classic App\backups\prelaunch_20261104_090827\verification_summary.json" -Name IsReadOnly -Value $true
```

---

### 1.3 Post-Application Verification & Write-Protection Probe

Live inspection was performed immediately following application:

```powershell
Get-Item "D:\Shivneri Classic App\backups\prelaunch_20261104_090827\*" | Select-Object FullName, Length, Attributes, IsReadOnly, LastWriteTime
```

**Observed Evidence**:
```
FullName      : D:\Shivneri Classic App\backups\prelaunch_20261104_090827\checksum.sha256
Length        : 102
Attributes    : ReadOnly, Archive
IsReadOnly    : True
LastWriteTime : 04-11-2026 09:08:28

FullName      : D:\Shivneri Classic App\backups\prelaunch_20261104_090827\shivneri_classic_admin_db_backup.gz
Length        : 8666
Attributes    : ReadOnly, Archive
IsReadOnly    : True
LastWriteTime : 04-11-2026 09:08:28

FullName      : D:\Shivneri Classic App\backups\prelaunch_20261104_090827\verification_summary.json
Length        : 15987
Attributes    : ReadOnly, Archive
IsReadOnly    : True
LastWriteTime : 04-11-2026 09:08:33
```

#### Real-Time Write-Protection Probe
To prove that write-protection is actively enforced by the operating system, a write probe was executed against the primary backup archive:

```powershell
[System.IO.File]::OpenWrite("D:\Shivneri Classic App\backups\prelaunch_20261104_090827\shivneri_classic_admin_db_backup.gz")
```

**OS Response**:
```
System.Management.Automation.MethodInvocationException: Exception calling "OpenWrite" with "1" argument(s): 
"Access to the path 'D:\Shivneri Classic App\backups\prelaunch_20261104_090827\shivneri_classic_admin_db_backup.gz' is denied."
```
**Conclusion**: Write operations from standard shell, Node.js, or file streams are **physically blocked by the OS kernel**.

---

### 1.4 Windows User Identity & NTFS ACL Inspection

A thorough forensic audit of the execution identity and NTFS security descriptors was conducted:

#### Execution Identity (`whoami /all`)
- **User Name**: `MAHESH-PC\mahesh` (SID: `S-1-5-21-1792402779-4024350364-2222756185-1001`)
- **Mandatory Integrity Level**: `Medium Mandatory Level` (Standard User Token under User Account Control / UAC)
- **Administrative Group Status**: `BUILTIN\Administrators` is present as **"Group used for deny only"** (filtered token; not elevated)
- **Active Membership**: Member of `NT AUTHORITY\Authenticated Users`, `BUILTIN\Users`, `Everyone`

#### NTFS Permissions (`icacls`)
Executing `icacls "D:\Shivneri Classic App\backups\prelaunch_20261104_090827\*"` revealed inherited permissions:
```
BUILTIN\Administrators:(I)(F)
NT AUTHORITY\SYSTEM:(I)(F)
NT AUTHORITY\Authenticated Users:(I)(M)
BUILTIN\Users:(I)(RX)
```

---

### 1.5 Forensic Assessment of Risky DENY ACL Rules

> [!CAUTION]
> **WHY EXPLICIT DENY ACL RULES WERE DELIBERATELY EXCLUDED**
> 
> In Phase 8.3.2, applying `icacls ... /deny "Authenticated Users":(WD,DE)` was proposed to block write/delete actions.
> 
> **Forensic Proof of Catastrophic Lockout Hazard**:
> 1. In Windows NTFS security evaluation, an explicit **`DENY` Access Control Entry (ACE) takes precedence over all `GRANT` ACEs**, regardless of user privilege.
> 2. The active operating account `MAHESH-PC\mahesh` is an explicit member of `NT AUTHORITY\Authenticated Users`.
> 3. Because `mahesh` is operating in a **`Medium Mandatory Level`** shell token (where `BUILTIN\Administrators` is restricted to "Group used for deny only"), applying a `DENY` rule against `Authenticated Users` would **immediately lock out `mahesh` from modifying, managing, or restoring the backup files**.
> 4. In an emergency recovery scenario during cleanup, the operator would be unable to overwrite, move, or manipulate backup archives without launching an elevated UAC administrative command prompt to take ownership (`takeown /f`) and forcibly reset ACLs (`icacls /reset`).
> 
> **Safe Protection Strategy**:
> - Enforce protection using the **verified Windows Read-Only attribute (`+R`)**.
> - Do NOT apply blunt `DENY` rules that jeopardize operator recovery access.
> - This achieves deterministic write-blocking for all scripts and processes while ensuring that legitimate administrative recovery remains non-destructive and fully accessible.

---

## 2. TASK 2 – Physical Disk Forensics & Secondary Backup Implementation

### 2.1 Hardware Inventory of Physical Disks and Volumes

A physical storage hardware audit was executed using Windows CIM storage providers:

```powershell
Get-CimInstance Win32_DiskDrive | Select-Object DeviceID, Model, InterfaceType, MediaType, Size, Partitions
Get-Partition | Select-Object DiskNumber, PartitionNumber, DriveLetter, Size, Type
```

#### Hardware Findings Matrix

| Device ID | Hardware Model | Media Type | Total Size | Drive Letter | Partition Role |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `\\.\PHYSICALDRIVE0` | **TOSHIBA MQ04ABF100** | Fixed Hard Disk (HDD) | 1,000,202,273,280 B (~1 TB) | **`D:`** (664.7 GB)<br>**`E:`** (334.4 GB) | **Host Volume for Project Repository** (`D:\Shivneri Classic App`) |
| `\\.\PHYSICALDRIVE1` | **WDC WDS240G2G0B-00EPW0** | Fixed Solid State (SSD) | 240,054,796,800 B (~240 GB) | **`C:`** (220.7 GB) | **Genuinely Separate Physical Drive** (OS & User Profiles, 6.75 GB Free) |

---

### 2.2 Physical Separation vs. "Offline" Status

#### 1. Genuinely Separate Physical Disk Confirmed
- The active repository and primary backup reside on **Disk 0** (`TOSHIBA MQ04ABF100` SATA 5400RPM HDD, Volume `D:`).
- Volume `C:` resides entirely on **Disk 1** (`WDC WDS240G2G0B-00EPW0` M.2 SATA SSD).
- Therefore, **Disk 1 is a genuinely independent physical hardware device** with independent physical NAND flash memory, controller, and bus interface. A mechanical failure, head crash, or platter corruption on Disk 0 will **not** affect Disk 1.

#### 2. Physical Limitation: Absence of True "Offline" / Air-Gapped Media
- Both `PHYSICALDRIVE0` and `PHYSICALDRIVE1` are **internal, fixed, online disks** mounted inside the computer chassis.
- There are **strictly NO external USB flash drives, external portable hard drives, or disconnected media** attached to the system.
- **Reporting of Limitation (Instruction 6 Compliance)**:
  In accordance with Task 2 Item 6, **we do NOT designate the secondary copy as an "offline" backup**. Calling a folder on an internal fixed SSD an "offline backup" would be a false claim. We report this accurately as an **on-machine secondary copy on an independent physical disk**.

---

### 2.3 Creation and Verification of the Secondary Backup Copy

Because a separate physical disk (`PHYSICALDRIVE1` / Volume `C:`) is available, a timestamped secondary backup copy was created:

#### Designated Target Directory
`C:\Users\mahes\Shivneri_Backups_Secondary\prelaunch_20261104_090827\`

#### Execution Procedure
```powershell
$srcDir = "D:\Shivneri Classic App\backups\prelaunch_20261104_090827"
$destDir = "C:\Users\mahes\Shivneri_Backups_Secondary\prelaunch_20261104_090827"

New-Item -ItemType Directory -Path $destDir -Force
Copy-Item -Path "$srcDir\*" -Destination $destDir -Force
```

#### Secondary Copy Inspection
```
Name          : checksum.sha256
Length        : 102
Attributes    : ReadOnly, Archive
IsReadOnly    : True
LastWriteTime : 04-11-2026 09:08:28

Name          : shivneri_classic_admin_db_backup.gz
Length        : 8666
Attributes    : ReadOnly, Archive
IsReadOnly    : True
LastWriteTime : 04-11-2026 09:08:28

Name          : verification_summary.json
Length        : 15987
Attributes    : ReadOnly, Archive
IsReadOnly    : True
LastWriteTime : 04-11-2026 09:08:33
```

---

### 2.4 Secondary Archive SHA256 Verification

The SHA256 checksum of the secondary archive was computed independently and compared against the primary archive and reference checksum:

```powershell
$primaryArchive   = "D:\Shivneri Classic App\backups\prelaunch_20261104_090827\shivneri_classic_admin_db_backup.gz"
$secondaryArchive = "C:\Users\mahes\Shivneri_Backups_Secondary\prelaunch_20261104_090827\shivneri_classic_admin_db_backup.gz"
$checksumFile     = "D:\Shivneri Classic App\backups\prelaunch_20261104_090827\checksum.sha256"

$expectedHash  = (Get-Content $checksumFile).Split(" ")[0].Trim().ToUpper()
$primaryHash   = (Get-FileHash -Path $primaryArchive -Algorithm SHA256).Hash.ToUpper()
$secondaryHash = (Get-FileHash -Path $secondaryArchive -Algorithm SHA256).Hash.ToUpper()
```

#### Cryptographic Parity Results

```
Expected Reference Checksum : DDA990926AC61AE830A6E8F81A56C54214243F6080B50EE7EF4E9B3549B9F1EC
Primary Archive Hash (Disk 0): DDA990926AC61AE830A6E8F81A56C54214243F6080B50EE7EF4E9B3549B9F1EC
Secondary Archive Hash(Disk 1): DDA990926AC61AE830A6E8F81A56C54214243F6080B50EE7EF4E9B3549B9F1EC

PrimaryMatches   : TRUE
SecondaryMatches : TRUE
ExactParity      : TRUE
```

**Result**: **100% Cryptographic Parity across separate physical drives**.

---

### 2.5 Secondary Copy Read-Only Attribute Verification & Probe

The Read-Only attribute was explicitly re-asserted and verified on all secondary copy artifacts:

```powershell
Get-ChildItem -Path "C:\Users\mahes\Shivneri_Backups_Secondary\prelaunch_20261104_090827" | ForEach-Object {
    Set-ItemProperty -Path $_.FullName -Name IsReadOnly -Value $true
}
```

#### Write-Protection Probe on Secondary Copy
```powershell
[System.IO.File]::OpenWrite("C:\Users\mahes\Shivneri_Backups_Secondary\prelaunch_20261104_090827\shivneri_classic_admin_db_backup.gz")
```

**OS Response**:
```
System.Management.Automation.MethodInvocationException: Exception calling "OpenWrite" with "1" argument(s): 
"Access to the path 'C:\Users\mahes\Shivneri_Backups_Secondary\prelaunch_20261104_090827\shivneri_classic_admin_db_backup.gz' is denied."
```
**Conclusion**: Both the primary archive on Disk 0 (HDD) and the secondary copy on Disk 1 (SSD) are **actively write-protected and mathematically verified**.

---

## 3. TASK 3 – Official Report Corrections

In accordance with Task 3, the following status corrections are formally documented:

| Item / Claim | Phase 8.3.2 Description | Corrected State in Phase 8.3.3 | Resolution / Evidence |
| :--- | :--- | :--- | :--- |
| **Primary Read-Only Protection** | Stated as "Designed / Ready" | **Implemented & Verified** | `IsReadOnly: True`, write-probe blocked with access denied exception. |
| **Secondary Backup Status** | Proposed on volume `D:\` and termed "Offline" | **Implemented on Separate Physical Disk (`PHYSICALDRIVE1` SSD / `C:`)**; explicitly **NOT** designated "Offline". | Copied to `C:\Users\mahes\...`, SHA256 verified (`dda99092...`), Read-Only applied. Hardware boundary reported. |
| **Write Isolation Status** | Stated as "Established" | **Designed & Specified; NOT YET EXECUTED** | Application servers (ports 5000, 5173) are not currently active, but the formal maintenance window shutdown protocol will be executed immediately prior to cleanup. |
| **Baseline Census Exact Numbers** | User prompt referenced "1 counter, 131 audit logs" | **10 collections, 194 total documents, exactly 2 counters, exactly 129 audit logs** | Live database census verified: 2 counter docs (`receipt_202612`, `expense_202612`) + 129 audit logs = 131 operational records; total census = 194 documents. |

---

## 4. Live Production Database Verification (Read-Only)

A live read-only audit of `shivneri_classic_admin_db` conducted at `2026-11-04T09:31:40+05:30` confirms **STRICTLY ZERO PRODUCTION WRITES**:

```
=== LIVE PRODUCTION DB STATUS ===
cashbookopeningbalances    1
counters                   2
admins                     1
auditlogs                  129
expenses                   5
payments                   7
residents                  16
maintenanceconfigs         1
maintenancedues            32
expensecategories          0
-----------------------------------
TOTAL COLLECTIONS:         10
TOTAL DOCUMENTS:           194
```

### Master Records State
- `admins`: Exactly 1 document (`श्री ल.रा. कोळी`, `role: SUPER_ADMIN`, `singletonKey: SHIVNERI_SUPER_ADMIN_SINGLETON`).
- `residents`: Exactly 16 approved Marathi member records active.
- `maintenanceconfigs`: Exactly 1 document (`defaultMonthlyAmount: 1000`).
- **Data Mutation Count in Phase 8.3.3**: **STRICTLY ZERO**.

---

## 5. Residual Risk Assessment

Before authorization of any pre-launch cleanup, the following technical boundaries and residual risks are recognized:

1. **Online Chassis Exposure**:
   Both `PHYSICALDRIVE0` (HDD) and `PHYSICALDRIVE1` (SSD) reside in the same physical computer chassis and share the same motherboard, power supply, and operating system. While protected against single-drive physical failure, they are not immune to catastrophic electrical damage, theft, or whole-system disasters. True air-gapped disaster recovery requires exporting the archive to an external USB drive or remote offsite storage.
2. **Administrative Override**:
   Any process executing with elevated administrative privileges (High Mandatory Level under UAC) can strip the Windows Read-Only attribute (`IsReadOnly = $false`). The protection prevents accidental script deletion or developer error, but does not provide hardware WORM compliance.
3. **Execution Gating**:
   Production cleanup must remain gated behind explicit written user authorization, following the verified write-isolation shutdown protocol.

---

## 6. Strict Standstill Notice

In strict adherence to instructions:
- **NO production database writes or deletions have been performed.**
- **NO cleanup scripts have been executed.**
- **NO MongoDB configuration changes have been made.**
- **NO application code or schema changes have been made.**
- **NO Phase 9 launch activities have been started.**
- **The primary backup has NOT been overwritten or relocated.**

**All backup protection actions are complete. Awaiting your explicit written authorization before proceeding.**

