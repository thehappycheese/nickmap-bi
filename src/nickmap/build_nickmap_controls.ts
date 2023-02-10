import { Control } from 'ol/control';

export function build_nickmap_controls() {
    let container_element = document.createElement("div");
    container_element.setAttribute("id", "nickmap-controls-container");
    return new Control({ element: container_element });
}
