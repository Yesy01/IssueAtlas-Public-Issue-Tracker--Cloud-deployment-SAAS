# Infrastructure Overview

- Azure Resource Group: dpcs-rg
- VM: dpcs-vm (Ubuntu, Nginx, Docker, UFW, auto-shutdown)
- PostgreSQL Flexible Server: dpcs-pg (issues_db database)
- Storage Account: dpcsstorageacount1 (container: issues)
- VM Managed Identity with "Storage Blob Data Contributor" on storage account
