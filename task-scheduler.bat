@echo off
schtasks /create /tn "MiseAJourProgrammeRunning" /tr "node %~dp0auto-update.js" /sc weekly /d SUN /st 00:00 /f
echo Tache planifiee creee avec succes ! 