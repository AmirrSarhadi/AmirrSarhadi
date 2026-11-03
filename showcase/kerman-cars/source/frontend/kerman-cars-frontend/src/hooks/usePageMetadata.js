import { useEffect } from "react";

// Client-side metadata improves browser and JS-capable crawler output; a
// production crawler strategy still needs server rendering or prerendering.
export default function usePageMetadata({ title, description, path, noindex = false }) {
    useEffect(() => {
        const oldTitle = document.title;
        const changes = [];
        const set = (selector, tag, attributes, valueAttribute, value) => {
            let node = document.head.querySelector(selector);
            const created = !node;
            if (!node) {
                node = document.createElement(tag);
                Object.entries(attributes).forEach(([key, val]) => node.setAttribute(key, val));
                document.head.append(node);
            }
            const previous = node.getAttribute(valueAttribute);
            changes.push({ node, created, previous, valueAttribute });
            node.setAttribute(valueAttribute, value);
        };
        document.title = title;
        set('meta[name="description"]', 'meta', { name: 'description' }, 'content', description);
        set('link[rel="canonical"]', 'link', { rel: 'canonical' }, 'href', new URL(path, window.location.origin).href);
        if (noindex) set('meta[name="robots"]', 'meta', { name: 'robots' }, 'content', 'noindex, nofollow');
        return () => {
            document.title = oldTitle;
            changes.reverse().forEach(({ node, created, previous, valueAttribute }) => {
                if (created) node.remove();
                else if (previous === null) node.removeAttribute(valueAttribute);
                else node.setAttribute(valueAttribute, previous);
            });
        };
    }, [title, description, path, noindex]);
}
