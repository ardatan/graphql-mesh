import React, { useState } from "react";
import styles from './styles.module.css';

const EXAMPLES = {
    'OpenAPI JavaScript Wiki': 'openapi-javascript-wiki',
    'OpenAPI Location Weather': 'openapi-location-weather',
    'OpenAPI YouTrack': 'openapi-youtrack',
    'JSON Schema': 'json-schema-example',
    'OData TripPin': 'odata-trippin',
    'SOAP Country Info': 'soap-country-info',
    'SQLite Chinook': 'sqlite-chinook',
};

const DEFAULT_EXAMPLE_NAME = Object.keys(EXAMPLES)[0];

export default () => {

    const [exampleName, setExampleName] = useState(DEFAULT_EXAMPLE_NAME);
    const [exampleRepo, setExampleRepo] = useState(EXAMPLES[DEFAULT_EXAMPLE_NAME]);

    const changeExample = (exampleName) =>{
        setExampleName(exampleName);
        setExampleRepo(EXAMPLES[exampleName]);
    }
    return (
        <div>
            <div className={styles.picker}>
            Choose Live Example: <select value={exampleName} onChange={e => changeExample(e.target.value)}>
                {Object.keys(EXAMPLES).map(name => (
                <option key={name} value={name}>
                    {name}
                </option>
                ))}
            </select>
            </div>
            <div className={styles.container}>
            <iframe
                src={'https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/' + exampleRepo + '?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml'}
                style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
                title={exampleName}
                allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
                sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"/>
            </div>
        </div>
    );
}