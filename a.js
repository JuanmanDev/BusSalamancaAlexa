export const handler = async (event) => {
    const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

    try {
        // PRUEBA 1: ¿Tengo internet?
        log("1. Probando conexión a Google (Internet Check)...");
        try {
            const google = await fetch("https://www.google.com", { method: 'HEAD', signal: AbortSignal.timeout(1000) });
            log(`✅ Internet OK (Google Status: ${google.status})`);
        } catch (e) {
            log(`❌ FALLO Internet: ${e.message}`);
            // Si falla Google, es problema de VPC/Configuración de red de AWS
            return "Error: No hay salida a Internet";
        }

        // PRUEBA 2: ¿Llego al servidor de Salamanca?
        log("2. Probando conexión a Bus Salamanca...");
        try {
            const start = Date.now();
            // Probamos solo un HEAD o una conexión rápida
            const bus = await fetch("http://95.63.53.46:8015/SIRI/SiriWS.asmx", {
                method: 'GET', // Usamos GET solo para ver si conecta, aunque de 500/404
                signal: AbortSignal.timeout(1500)
            });
            log(`✅ Servidor Bus Accesible (${Date.now() - start}ms) - Status: ${bus.status}`);
        } catch (e) {
            log(`❌ FALLO Servidor Bus: ${e.message}`);
            if (e.name === 'TimeoutError') return "Error: El servidor del bus es accesible pero MUY lento (Timeout)";
            return "Error: El servidor del bus rechaza la conexión (posible bloqueo de IP)";
        }

        return "Diagnóstico Completado";

    } catch (e) {
        log(`Error General: ${e.message}`);
        return JSON.stringify(e);
    }
};

handler();