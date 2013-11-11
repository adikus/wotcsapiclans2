module.exports = {
    get:{
        '/': 'loaders#index',
        '/admin':'loaders#admin',
        '/login':'loaders#login',
        '/clans/:id': 'clans#index',
        '/clans/:id/changes': 'clans#changes'
    },

    post: {
        '/admin':'loaders#auth'
    }
};