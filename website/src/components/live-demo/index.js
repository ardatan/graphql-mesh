import React, { useState } from "react";
import styles from './styles.module.css';

const EXAMPLES = {
    'OpenAPI': {
        'JavaScript Wiki': 'openapi-javascript-wiki',
        'Location Weather': 'openapi-location-weather',
        'YouTrack': 'openapi-youtrack',
    },
    'JSON Schema': {
        'Fake API': 'json-schema-example',
    },
    'OData':{
        'TripPin': 'odata-trippin'
    },
    'SOAP': {
        'Country Info': 'soap-country-info'
    },
    'SQLite': {
        'Chinook': 'sqlite-chinook'
    }
};

export default () => {

    const [exampleRepo, setExampleRepo] = useState('openapi-javascript-wiki');

    return (
        <div>
            <div className={styles.picker}>
            Choose Live Example: <select value={exampleRepo} onChange={e => setExampleRepo(e.target.value)}>
                {Object.keys(EXAMPLES).map(groupName => (
                    <optgroup key={groupName} label={groupName}>
                        {Object.keys(EXAMPLES[groupName]).map(
                            exampleName => (
                                <option key={exampleName} label={exampleName} value={EXAMPLES[groupName][exampleName]}>
                                    {exampleName}
                                </option>
                            )
                        )}
                    </optgroup>
                ))}
            </select>
            </div>
            <div className={styles.container}>
            <iframe
                src={'https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/' + exampleRepo + '?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml'}
                style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
                title={exampleRepo}
                allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
                sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"/>
            </div>
        </div>
    );
}