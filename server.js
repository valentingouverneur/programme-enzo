const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Middleware pour servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Middleware pour logger les requêtes
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Fonction utilitaire pour lire le fichier JSON
function lireProgrammes() {
    try {
        const filePath = path.join(process.cwd(), 'training-programs.json');
        console.log('Tentative de lecture du fichier:', filePath);
        const jsonString = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error);
        throw error;
    }
}

// Fonction utilitaire pour sauvegarder le fichier JSON
function sauvegarderProgrammes(programmes) {
    try {
        const filePath = path.join(process.cwd(), 'training-programs.json');
        fs.writeFileSync(filePath, JSON.stringify(programmes, null, 2));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du fichier:', error);
        throw error;
    }
}

// Fonction pour obtenir la semaine actuelle basée sur la date
function obtenirSemaineActuelle(semaines, dateSimulation = null) {
    const aujourdhui = dateSimulation ? new Date(dateSimulation) : new Date();
    console.log('Date à vérifier:', aujourdhui.toISOString());
    
    // Parcourir toutes les semaines pour trouver celle qui contient la date
    for (const [numero, semaine] of Object.entries(semaines)) {
        if (!semaine.dateDebut) continue;
        
        const dateDebut = new Date(semaine.dateDebut);
        const dateFin = new Date(dateDebut);
        dateFin.setDate(dateFin.getDate() + 6); // La semaine dure 7 jours
        
        console.log(`Semaine ${numero} - du ${dateDebut.toISOString()} au ${dateFin.toISOString()}`);
        
        if (aujourdhui >= dateDebut && aujourdhui <= dateFin) {
            console.log(`→ Date trouvée dans la semaine ${numero}`);
            return numero;
        }
    }

    console.log('→ Aucune semaine trouvée, retour à la semaine 1');
    // Si aucune semaine ne contient la date, retourner la première semaine
    return "1";
}

// Fonction pour calculer les totaux à partir des étapes
function calculerTotaux(etapes) {
    let dureeTotale = 0;
    let distanceTotale = 0;

    etapes.forEach(etape => {
        dureeTotale += parseFloat(etape.duree);
        
        // Calcul de la distance en fonction de l'allure et de la durée
        if (etape.allure && etape.allure !== 'lente') {
            // Convertir l'allure (ex: "5:40") en minutes par km
            const [minutes, secondes] = etape.allure.split(':').map(Number);
            const allureEnMinutes = minutes + (secondes / 60);
            
            // Calculer la distance en km
            const distance = parseFloat(etape.duree) / allureEnMinutes;
            distanceTotale += distance;
        }
    });

    return {
        duree: Math.round(dureeTotale),
        distance: Math.round(distanceTotale * 10) / 10
    };
}

// Route pour servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint pour obtenir le programme de la semaine actuelle
app.get('/api/programme-actuel', async (req, res) => {
    try {
        const programmes = lireProgrammes();
        const dateSimulation = req.query.date;
        console.log('Date demandée:', dateSimulation);
        
        const semaineActuelle = req.query.semaine || obtenirSemaineActuelle(programmes.programme10km.semaines, dateSimulation);
        console.log('Semaine calculée:', semaineActuelle);

        // Vérifier si la semaine demandée existe
        if (!programmes.programme10km.semaines[semaineActuelle]) {
            console.log('Semaine non trouvée:', semaineActuelle);
            return res.status(404).json({ error: 'Semaine non trouvée' });
        }

        const response = {
            ...programmes.programme10km,
            semaine_actuelle: semaineActuelle,
            duree_totale_semaines: programmes.programme10km.duree_semaines,
            seances: programmes.programme10km.semaines[semaineActuelle].seances,
            titre: programmes.programme10km.titre,
            description: programmes.programme10km.description
        };

        res.json(response);
    } catch (error) {
        console.error('Erreur lors de la lecture du programme:', error);
        res.status(500).json({ error: 'Erreur lors de la lecture du programme' });
    }
});

// Endpoint pour obtenir toutes les semaines
app.get('/api/semaines', async (req, res) => {
    try {
        const programmes = lireProgrammes();
        res.json(programmes.programme10km.semaines);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la lecture des semaines' });
    }
});

// Endpoint pour ajouter une nouvelle semaine
app.post('/api/semaines', async (req, res) => {
    try {
        const programmes = lireProgrammes();
        const { dateDebut, numero } = req.body;
        
        if (programmes.programme10km.semaines[numero]) {
            return res.status(400).json({ error: 'Cette semaine existe déjà' });
        }
        
        programmes.programme10km.semaines[numero] = {
            dateDebut,
            seances: []
        };
        
        sauvegarderProgrammes(programmes);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de l\'ajout de la semaine' });
    }
});

// Endpoint pour supprimer une semaine
app.delete('/api/semaines/:numero', async (req, res) => {
    try {
        const programmes = lireProgrammes();
        const numeroSemaine = req.params.numero;
        
        if (!programmes.programme10km.semaines[numeroSemaine]) {
            return res.status(404).json({ error: 'Semaine non trouvée' });
        }
        
        delete programmes.programme10km.semaines[numeroSemaine];
        sauvegarderProgrammes(programmes);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression de la semaine' });
    }
});

// Endpoint pour ajouter une nouvelle séance
app.post('/api/seances', async (req, res) => {
    try {
        console.log('Nouvelle séance reçue:', req.body);
        const programmes = lireProgrammes();
        const semaineActuelle = obtenirSemaineActuelle(programmes.programme10km.semaines);
        console.log('Semaine actuelle:', semaineActuelle);
        
        // Calculer les totaux à partir des étapes
        const totaux = calculerTotaux(req.body.etapes);
        
        // Ajouter la nouvelle séance
        const nouvelleSeance = {
            ...req.body,
            id: programmes.programme10km.semaines[semaineActuelle].seances.length + 1,
            numero_seance: programmes.programme10km.semaines[semaineActuelle].seances.length + 1,
            duree: totaux.duree,
            distance: totaux.distance
        };
        
        programmes.programme10km.semaines[semaineActuelle].seances.push(nouvelleSeance);
        sauvegarderProgrammes(programmes);
        console.log('Séance ajoutée avec succès');
        
        res.json({ success: true, seance: nouvelleSeance });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la séance:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout de la séance' });
    }
});

// Endpoint pour modifier une séance existante
app.put('/api/seances/:index', async (req, res) => {
    try {
        const programmes = lireProgrammes();
        const semaineActuelle = obtenirSemaineActuelle(programmes.programme10km.semaines);
        const index = parseInt(req.params.index);
        
        if (index >= programmes.programme10km.semaines[semaineActuelle].seances.length) {
            return res.status(404).json({ error: 'Séance non trouvée' });
        }
        
        // Calculer les totaux à partir des étapes
        const totaux = calculerTotaux(req.body.etapes);
        
        // Mettre à jour la séance
        programmes.programme10km.semaines[semaineActuelle].seances[index] = {
            ...programmes.programme10km.semaines[semaineActuelle].seances[index],
            ...req.body,
            id: index + 1,
            numero_seance: index + 1,
            duree: totaux.duree,
            distance: totaux.distance
        };
        
        sauvegarderProgrammes(programmes);
        res.json({ success: true, seance: programmes.programme10km.semaines[semaineActuelle].seances[index] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la modification de la séance' });
    }
});

// Endpoint pour supprimer une séance
app.delete('/api/seances/:index', async (req, res) => {
    try {
        const programmes = lireProgrammes();
        const semaineActuelle = obtenirSemaineActuelle(programmes.programme10km.semaines);
        const index = parseInt(req.params.index);
        
        // Supprimer la séance
        programmes.programme10km.semaines[semaineActuelle].seances.splice(index, 1);
        
        // Mettre à jour les IDs et numéros de séance
        programmes.programme10km.semaines[semaineActuelle].seances.forEach((seance, i) => {
            seance.id = i + 1;
            seance.numero_seance = i + 1;
        });
        
        sauvegarderProgrammes(programmes);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression de la séance' });
    }
});

// Endpoint pour obtenir toutes les séances de toutes les semaines
app.get('/api/seances-toutes', async (req, res) => {
    try {
        const programmes = lireProgrammes();
        const toutesLesSeances = [];
        
        for (const [numero, semaine] of Object.entries(programmes.programme10km.semaines)) {
            semaine.seances.forEach(seance => {
                toutesLesSeances.push({
                    ...seance,
                    numeroSemaine: parseInt(numero),
                    dateDebut: semaine.dateDebut
                });
            });
        }
        
        res.json(toutesLesSeances);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la lecture des séances' });
    }
});

// Endpoint pour déplacer une séance vers une autre semaine
app.put('/api/seances/:index/deplacer', async (req, res) => {
    try {
        const programmes = lireProgrammes();
        const { nouvelleSemaine } = req.body;
        const semaineActuelle = obtenirSemaineActuelle(programmes.programme10km.semaines);
        const index = parseInt(req.params.index);
        
        if (!programmes.programme10km.semaines[nouvelleSemaine]) {
            return res.status(404).json({ error: 'Semaine de destination non trouvée' });
        }
        
        // Récupérer la séance à déplacer
        const seance = programmes.programme10km.semaines[semaineActuelle].seances[index];
        
        // Supprimer la séance de la semaine actuelle
        programmes.programme10km.semaines[semaineActuelle].seances.splice(index, 1);
        
        // Ajouter la séance à la nouvelle semaine
        programmes.programme10km.semaines[nouvelleSemaine].seances.push({
            ...seance,
            id: programmes.programme10km.semaines[nouvelleSemaine].seances.length + 1,
            numero_seance: programmes.programme10km.semaines[nouvelleSemaine].seances.length + 1
        });
        
        // Mettre à jour les IDs de la semaine d'origine
        programmes.programme10km.semaines[semaineActuelle].seances.forEach((seance, i) => {
            seance.id = i + 1;
            seance.numero_seance = i + 1;
        });
        
        sauvegarderProgrammes(programmes);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors du déplacement de la séance' });
    }
});

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
}); 