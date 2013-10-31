module.exports = {
    get:{
        '/': 'loaders#index',
        '/login':'loaders#login',
        '/clans/:id': 'clans#index',
        '/clans/:id/changes': 'clans#changes'
    },
    post: {
        '/admin':'loaders#admin'
    }
};