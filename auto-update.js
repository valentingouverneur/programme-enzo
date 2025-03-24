const fs = require('fs').promises;
const path = require('path');

async function updateTrainingWeek() {
    try {
        // Lire le fichier JSON
        const data = await fs.readFile('training-programs.json', 'utf8');
        const programmes = JSON.parse(data);
        
        // Calculer la nouvelle semaine
        const semaineActuelle = parseInt(Object.keys(programmes.programme10km.semaines)[0]);
        const nouvelleSemaine = (semaineActuelle % programmes.programme10km.duree_totale_semaines) + 1;
        
        // Mettre à jour le programme
        const anciennesSemaines = programmes.programme10km.semaines;
        programmes.programme10km.semaines = {
            [nouvelleSemaine]: anciennesSemaines[semaineActuelle]
        };
        
        // Sauvegarder les modifications
        await fs.writeFile('training-programs.json', JSON.stringify(programmes, null, 2));
        console.log(`Programme mis à jour pour la semaine ${nouvelleSemaine}`);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du programme:', error);
    }
}

// Exécuter la mise à jour
updateTrainingWeek(); 