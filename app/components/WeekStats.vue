<template>
    <div class="flex gap-6">
        <div>
            <p class="text-gray-400 text-sm">Distance totale</p>
            <p class="text-white font-semibold" x-text="calculerDistanceTotale() + ' km'">26 km</p>
        </div>
        <div>
            <p class="text-gray-400 text-sm">Durée totale</p>
            <p class="text-white font-semibold" x-text="calculerDureeTotale() + ' min'">155 min</p>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        semaine: {
            type: Object,
            required: true
        }
    },
    methods: {
        calculerDistanceTotale() {
            return this.semaine.seances.reduce((total, seance) => total + seance.distance, 0);
        },
        calculerDureeTotale() {
            return this.semaine.seances.reduce((total, seance) => total + seance.duree, 0);
        }
    }
}
</script> 