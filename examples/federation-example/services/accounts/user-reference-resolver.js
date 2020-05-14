module.exports = function(root, context) {
    return context.accounts.api.user({ id: root.id });
}
