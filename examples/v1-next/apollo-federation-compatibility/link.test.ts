import { readFileSync } from 'fs';
import { join } from 'path';
import { stripIgnoredCharacters } from 'graphql';

it('aa', () => {
  const sdl = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8');
  const normalizedSDL = stripIgnoredCharacters(sdl);

  const linksRegex = /@link\(([\s\S]+?)\)/g;
  // should have @link imports
  expect(linksRegex.test(normalizedSDL)).toBe(true);

  let fedLinkCount = 0;
  normalizedSDL.match(linksRegex).forEach(element => {
    const urlRegex = /url:(\".+?\")/;
    // skip definitions
    if (urlRegex.test(element)) {
      const linkUrl = JSON.parse(element.match(urlRegex)[1]);
      const linkUrlSpecVersionRegex = /https:\/\/specs.apollo.dev\/federation\/v(.+)/;
      // only verify federation spec @links
      if (linkUrlSpecVersionRegex.test(linkUrl)) {
        fedLinkCount++;

        const federationVersion = linkUrl.match(linkUrlSpecVersionRegex)[1];
        // federation v2.0 through v2.7 are supported
        expect(federationVersion).toMatch(/2\.0|2\.1|2\.2|2\.3|2\.4|2\.5|2\.6|2\.7/);

        const linkImportsRegex = /import:\[(.+?)\]/;
        if (linkImportsRegex.test(element)) {
          // verify federation imports
          const expected = [
            '@authenticated',
            '@composeDirective',
            '@extends',
            '@external',
            '@inaccessible',
            '@interfaceObject',
            '@key',
            '@override',
            '@policy',
            '@provides',
            '@requires',
            '@requiresScopes',
            '@shareable',
            '@tag',
            'FieldSet',
            'Scope',
            'Policy',
          ];

          const linkImportsMatch = element.match(linkImportsRegex);
          const linkImports = linkImportsMatch[1].split(' ');
          linkImports.forEach(importedElement => {
            if (!expected.includes(importedElement.replaceAll('"', ''))) {
              expect('').toBe('unexpected federation import ${element}');
            }
          });
        }
      }
    }
  });

  if (fedLinkCount == 0) {
    expect('').toBe('missing federation spec @link imports');
  }

  if (fedLinkCount > 1) {
    expect('').toBe('schema @link imports multiple federation specs');
  }
});
