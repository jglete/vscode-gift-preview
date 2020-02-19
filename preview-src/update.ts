import morphdom from "morphdom";

interface OptionsHTML {
    initial?: boolean;
    snippets?: boolean;
}

export function updateHTML(html: string, options?: OptionsHTML) {
    const content: Element | null = document.querySelector('.vscode-body');
    if (content) {
        let doc = new DOMParser().parseFromString(html, 'text/html');
        let docBody = doc.querySelector('.vscode-body');

        if (docBody) {
            let addClasses = findExcludedClasses(content.classList, docBody.classList);
            
            if (addClasses.length > 0) {
                docBody.classList.add(...addClasses);
            }

            if (options && options.initial) {
                displaySnippets(docBody, options.initial, options);
            } else if (options && options.snippets) {
                displaySnippets(docBody, options.snippets, options);
            }

            morphdom(content, docBody, {
                onBeforeElUpdated: function(fromEl, toEl) {
                    if (fromEl.isEqualNode(toEl)) {
                        return false;
                    }
                    return true;
                }
            });
        }
    }
}

export function displaySnippets(element: any, state: boolean, options?: any) {
    const snippetDiv = <HTMLElement>element.querySelector('[data-js="snippet-div"]');
    const previewDiv = <HTMLElement>element.querySelector('[data-js="preview-div"]');
    const buttonDiv = <HTMLElement>element.querySelector('[data-js="button-div"]');

    switch(state) {
        case true:
            if (snippetDiv) {
                snippetDiv.style.display = "block";
            }
            if (previewDiv) {
                previewDiv.style.display = "none";
            }
            if (buttonDiv) {
                if (options && options.initial) {
                    buttonDiv.style.display = "none";
                } else {
                    buttonDiv.style.display = "block";
                }
            }
            break;

        case false:
            if (snippetDiv) {
                snippetDiv.style.display = "none";
            }
            if (previewDiv) {
                previewDiv.style.display = "block";
            }
            if (buttonDiv) {
                buttonDiv.style.display = "block";
            }
            break;
    }
}

function findExcludedClasses(oldList: DOMTokenList, newList: DOMTokenList): string[] {
    let arrayOld = [...oldList];
    let arrayNew = [...newList];
    return arrayOld.filter(x => arrayNew.indexOf(x) === -1);
}   
