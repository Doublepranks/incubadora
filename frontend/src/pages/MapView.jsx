import React from 'react';
import { Map, Clock, Rocket, Target } from 'lucide-react';

const MapView = () => {
    return (
        <div className="space-y-8 animate-fade-in relative min-h-[85vh] flex flex-col">
            {/* Background Map Image with Overlay */}
            <div className="absolute inset-0 z-0 rounded-3xl overflow-hidden border border-white/5 opacity-50 hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
                <img
                    src="/map-preview.png"
                    alt="Mapa de Distribuição de Influenciadores"
                    className="w-full h-full object-cover object-center grayscale-[20%] hover:grayscale-0 transition-all duration-700 hover:scale-105"
                />
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4">
                <div className="glass-panel p-8 md:p-12 rounded-3xl max-w-2xl mx-auto backdrop-blur-xl bg-zinc-950/70 border-white/10 shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse-slow">
                            <Map size={40} className="text-white" />
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                        Mapa de Calor & <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                            Distribuição Geográfica
                        </span>
                    </h1>

                    <p className="text-lg text-zinc-300 leading-relaxed mb-8 max-w-lg mx-auto">
                        Visualize estrategicamente onde seus influenciadores estão concentrados.
                        Planeje eventos regionais e campanhas localizadas com precisão cirúrgica
                        usando nossa tecnologia de geolocalização.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 w-full">
                        <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <Target className="text-emerald-400 mb-2" size={24} />
                            <span className="text-sm font-medium text-zinc-300">Targeting Regional</span>
                        </div>
                        <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <Rocket className="text-amber-400 mb-2" size={24} />
                            <span className="text-sm font-medium text-zinc-300">Eventos Otimizados</span>
                        </div>
                        <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <Map className="text-primary mb-2" size={24} />
                            <span className="text-sm font-medium text-zinc-300">Clusters de Influência</span>
                        </div>
                    </div>

                    <div className="inline-flex items-center px-6 py-3 rounded-full bg-zinc-900 border border-primary/30 text-primary font-medium text-sm">
                        <Clock size={16} className="mr-2 animate-spin-slow" />
                        Em desenvolvimento • Lançamento em breve
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapView;
