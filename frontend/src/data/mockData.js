
export const influencers = [
    {
        id: 1,
        name: "Carlos Silva",
        state: "SP",
        municipality: "São Paulo",
        platforms: {
            instagram: {
                handle: "@carlos.silva",
                url: "https://instagram.com/carlos.silva",
                followers: 125000,
                history: generateHistory(120000, 60, 50, 200), // start, days, minGrowth, maxGrowth
                posts: 45,
                lastUpdate: "2025-11-26T10:00:00Z",
                status: "OK"
            },
            x: {
                handle: "@carlossilva",
                url: "https://x.com/carlossilva",
                followers: 45000,
                history: generateHistory(44000, 60, 10, 50),
                posts: 120,
                lastUpdate: "2025-11-26T10:00:00Z",
                status: "OK"
            },
            youtube: {
                handle: "Carlos Silva TV",
                url: "https://youtube.com/carlossilva",
                followers: 80000,
                history: generateHistory(78000, 60, 20, 100),
                posts: 8,
                lastUpdate: "2025-11-26T10:00:00Z",
                status: "OK"
            }
        }
    },
    {
        id: 2,
        name: "Amanda Souza",
        state: "RJ",
        municipality: "Rio de Janeiro",
        platforms: {
            instagram: {
                handle: "@amanda.souza",
                url: "https://instagram.com/amanda.souza",
                followers: 300000,
                history: generateHistory(290000, 60, 100, 500),
                posts: 60,
                lastUpdate: "2025-11-26T10:00:00Z",
                status: "OK"
            },
            kwai: {
                handle: "@amandasouza",
                url: "https://kwai.com/amandasouza",
                followers: 500000,
                history: generateHistory(480000, 60, 200, 800),
                posts: 90,
                lastUpdate: "2025-11-26T10:00:00Z",
                status: "OK"
            }
        }
    },
    {
        id: 3,
        name: "Roberto Mendes",
        state: "MG",
        municipality: "Belo Horizonte",
        platforms: {
            instagram: {
                handle: "@roberto.mendes",
                url: "https://instagram.com/roberto.mendes",
                followers: 50000,
                history: generateHistory(49500, 60, 5, 20),
                posts: 15,
                lastUpdate: "2025-11-26T10:00:00Z",
                status: "OK"
            },
            x: {
                handle: "@betomendes",
                url: "https://x.com/betomendes",
                followers: 12000,
                history: generateHistory(11800, 60, 2, 10),
                posts: 200,
                lastUpdate: "2025-11-26T10:00:00Z",
                status: "OK"
            }
        }
    },
    {
        id: 4,
        name: "Juliana Ferreira",
        state: "RS",
        municipality: "Porto Alegre",
        platforms: {
            instagram: {
                handle: "@ju.ferreira",
                url: "https://instagram.com/ju.ferreira",
                followers: 85000,
                history: generateHistory(82000, 60, 30, 100),
                posts: 30,
                lastUpdate: "2025-11-26T10:00:00Z",
                status: "OK"
            },
            youtube: {
                handle: "Canal da Ju",
                url: "https://youtube.com/canaldaju",
                followers: 150000,
                history: generateHistory(145000, 60, 50, 150),
                posts: 12,
                lastUpdate: "2025-11-26T10:00:00Z",
                status: "OK"
            }
        }
    },
    {
        id: 5,
        name: "Ricardo Oliveira",
        state: "BA",
        municipality: "Salvador",
        platforms: {
            instagram: {
                handle: "@ricardo.ba",
                url: "https://instagram.com/ricardo.ba",
                followers: 200000,
                history: generateHistory(195000, 60, 80, 300),
                posts: 50,
                lastUpdate: "2025-11-26T10:00:00Z",
                status: "OK"
            },
            x: {
                handle: "@ricardoba",
                url: "https://x.com/ricardoba",
                followers: 90000,
                history: generateHistory(89000, 60, 10, 40),
                posts: 150,
                lastUpdate: "2025-11-26T10:00:00Z",
                status: "OK"
            },
            kwai: {
                handle: "@ricardokwai",
                url: "https://kwai.com/ricardokwai",
                followers: 300000,
                history: generateHistory(290000, 60, 100, 400),
                posts: 80,
                lastUpdate: "2025-11-26T10:00:00Z",
                status: "OK"
            }
        }
    }
];

function generateHistory(startFollowers, days, minGrowth, maxGrowth) {
    const history = [];
    let currentFollowers = startFollowers;
    const now = new Date();

    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Add some randomness to growth
        const growth = Math.floor(Math.random() * (maxGrowth - minGrowth + 1)) + minGrowth;
        currentFollowers += growth;

        // Randomly add posts count for that day (0 to 3)
        const posts = Math.floor(Math.random() * 4);

        history.push({
            date: date.toISOString().split('T')[0],
            followers: currentFollowers,
            posts: posts
        });
    }
    return history;
}
