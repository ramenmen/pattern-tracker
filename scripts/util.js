function redirect(path) {
    if (path) {
        location.replace(`/pattern-tracker${path}`);
    }
}
