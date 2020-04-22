# covid-mesh

It's a small test :)

## Live Preview

=> Have a look at the [codesandbox](https://codesandbox.io/s/github/jycouet/covid-mesh)

## Why & What?

I want to extend a public [Covid graphQL endpoint](https://covid-19.dava.engineer/api/graphql) with some other data like the population of the country. Sounds like a good scenario for [graphql-mesh](https://github.com/Urigo/graphql-mesh)!

For this I found an API with [country population data](https://datasource.kapsarc.org/explore/dataset/world-population/table/?disjunctive.country_name&rows=1&q=France&sort=year).

I did it in few steps... That you can find in the file [example-query.graphql](./example-query.graphql)
- STEP1: 2 sources side by side
- STEP2: 2 sources combined
- STEP3_1: 2 sources combined to get ratios
- STEP3_2: 2 sources combined to get ratios & case & population


