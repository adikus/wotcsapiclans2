module.exports = {
    get:{
        '/': 'loaders#index',
        '/admin':'loaders#admin',
        '/login':'loaders#login',
        '/worker':'loaders#worker',
        '/clans/:id': 'clans#index',
        '/clans/:id/changes': 'clans#changes'
    },
    post: {
        '/admin':'loaders#auth'
    }
};