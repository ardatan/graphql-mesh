import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
} from 'graphql';
import { ObjMapScalar } from '@graphql-mesh/transport-common';

export const LengthDirective = new GraphQLDirective({
  name: 'length',
  locations: [DirectiveLocation.SCALAR],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    min: {
      type: GraphQLInt,
    },
    max: {
      type: GraphQLInt,
    },
  },
});

export const DiscriminatorDirective = new GraphQLDirective({
  name: 'discriminator',
  locations: [DirectiveLocation.INTERFACE, DirectiveLocation.UNION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    field: {
      type: GraphQLString,
    },
    mapping: {
      type: new GraphQLList(new GraphQLList(GraphQLString)),
    },
  },
});

export const ResolveRootDirective = new GraphQLDirective({
  name: 'resolveRoot',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
  },
});

export const ResolveRootFieldDirective = new GraphQLDirective({
  name: 'resolveRootField',
  locations: [
    DirectiveLocation.FIELD_DEFINITION,
    DirectiveLocation.ARGUMENT_DEFINITION,
    DirectiveLocation.INPUT_FIELD_DEFINITION,
  ],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    field: {
      type: GraphQLString,
    },
  },
});

export const RegExpDirective = new GraphQLDirective({
  name: 'regexp',
  locations: [DirectiveLocation.SCALAR],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    pattern: {
      type: GraphQLString,
    },
  },
});

export const PubSubOperationDirective = new GraphQLDirective({
  name: 'pubsubOperation',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    pubsubTopic: {
      type: GraphQLString,
    },
  },
});

export const TypeScriptDirective = new GraphQLDirective({
  name: 'typescript',
  locations: [DirectiveLocation.SCALAR, DirectiveLocation.ENUM],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    type: {
      type: GraphQLString,
    },
  },
});

export const ResponseMetadataDirective = new GraphQLDirective({
  name: 'responseMetadata',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
  },
});

export const DictionaryDirective = new GraphQLDirective({
  name: 'dictionary',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
  },
});

export const FlattenDirective = new GraphQLDirective({
  name: 'flatten',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
  },
});

export const StatusCodeTypeNameDirective = new GraphQLDirective({
  name: 'statusCodeTypeName',
  locations: [DirectiveLocation.UNION],
  isRepeatable: true,
  args: {
    subgraph: {
      type: GraphQLString,
    },
    typeName: {
      type: GraphQLString,
    },
    statusCode: {
      type: GraphQLString,
    },
  },
});

export const EnumDirective = new GraphQLDirective({
  name: 'enum',
  locations: [DirectiveLocation.ENUM_VALUE],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    value: {
      type: GraphQLString,
    },
  },
});

export const OneOfDirective = new GraphQLDirective({
  name: 'oneOf',
  locations: [
    DirectiveLocation.OBJECT,
    DirectiveLocation.INTERFACE,
    DirectiveLocation.INPUT_OBJECT,
  ],
});

export const ExampleDirective = new GraphQLDirective({
  name: 'example',
  locations: [
    DirectiveLocation.FIELD_DEFINITION,
    DirectiveLocation.OBJECT,
    DirectiveLocation.INPUT_OBJECT,
    DirectiveLocation.ENUM,
    DirectiveLocation.SCALAR,
  ],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    value: {
      type: ObjMapScalar,
    },
  },
  isRepeatable: true,
});
