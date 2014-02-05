module.exports = {
    get:{
        '/': 'loaders#index',
        '/admin':'loaders#admin',
        '/login':'loaders#login',
        '/worker':'loaders#worker',
        '/queue/client':'queue#client',
        '/clans/:id': 'clans#index',
        '/clans/:id/changes': 'clans#changes',
        '/players/:id/changes': 'players#changes',
        '/clans/:id/changes/:month': 'clans#changes'
    },
    post: {
        '/admin':'loaders#auth'
    }
};