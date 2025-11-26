import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Chart from 'react-apexcharts';
import { ArrowLeft, Instagram, Youtube, Video, Twitter } from 'lucide-react';

const InfluencerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { allInfluencers } = useApp();

    const influencer = allInfluencers.find(inf => inf.id === parseInt(id));

    if (!influencer) {
        return <div className="text-center text-gray-500 dark:text-gray-400 mt-10">Influenciador não encontrado.</div>;
    }

    const getPlatformIcon = (platform) => {
        switch (platform) {
            case 'instagram': return <Instagram size={20} />;
            case 'youtube': return <Youtube size={20} />;
            case 'kwai': return <Video size={20} />; // Using Video icon for Kwai as placeholder
            case 'x': return <Twitter size={20} />;
            default: return null;
        }
    };

    const getPlatformColor = (platform) => {
        switch (platform) {
            case 'instagram': return 'text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400';
            case 'youtube': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
            case 'kwai': return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
            case 'x': return 'text-blue-400 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    return (
        <div className="space-y-6">
            <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft size={20} className="mr-2" />
                Voltar para Dashboard
            </button>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{influencer.name}</h1>
                        <p className="text-gray-500 dark:text-gray-400">{influencer.municipality} - {influencer.state}</p>
                    </div>
                    <div className="flex space-x-3">
                        {Object.keys(influencer.platforms).map(platform => (
                            <a
                                key={platform}
                                href={influencer.platforms[platform].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-3 rounded-full ${getPlatformColor(platform)} hover:opacity-80 transition-opacity`}
                            >
                                {getPlatformIcon(platform)}
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(influencer.platforms).map(([platformName, data]) => {
                    const historyDates = data.history.map(h => h.date).reverse();
                    const historyFollowers = data.history.map(h => h.followers).reverse();

                    const chartOptions = {
                        chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
                        dataLabels: { enabled: false },
                        stroke: { curve: 'smooth' },
                        xaxis: { categories: historyDates, labels: { style: { colors: '#9ca3af' } } },
                        yaxis: { labels: { style: { colors: '#9ca3af' } } },
                        grid: { borderColor: '#374151', strokeDashArray: 4 },
                        theme: { mode: 'dark' },
                        colors: [platformName === 'instagram' ? '#db2777' : platformName === 'youtube' ? '#dc2626' : platformName === 'kwai' ? '#f97316' : '#3b82f6']
                    };

                    const chartSeries = [{ name: 'Seguidores', data: historyFollowers }];

                    return (
                        <div key={platformName} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white capitalize">{platformName}</h3>
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {data.followers.toLocaleString()} seguidores
                                </span>
                            </div>
                            <Chart options={chartOptions} series={chartSeries} type="area" height={250} />
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Posts Totais</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{data.posts}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Última Atualização</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date(data.lastUpdate).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default InfluencerDetail;
