export default {
  Pet: {
    fullName: (root: { name?: string }) => (root.name ? `${root.name} (full)` : null),
  },
};
