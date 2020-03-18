import { Schema, model } from 'mongoose';

const LanguagesSchema = new Schema(
  {
    language: String,
    skill: {
      type: String,
      enum: ['basic', 'fluent', 'native'],
    },
  },
  {
    _id: false, // disable `_id` field for `Language` schema
  }
);

const AddressSchema = new Schema({
  street: String,
  geo: {
    type: [Number], // [<longitude>, <latitude>]
    index: '2dsphere', // create the geospatial index
  },
});

export const UserSchema = new Schema(
  {
    name: {
      type: String,
      index: true,
    },
    age: {
      type: Number,
      index: true,
    },
    languages: {
      type: [LanguagesSchema], // you may include other schemas (also as array of embedded documents)
      default: [],
    },
    contacts: {
      // another mongoose way for providing embedded documents
      email: String,
      phones: [String], // array of strings
    },
    gender: {
      // enum field with values
      type: String,
      enum: ['male', 'female', 'ladyboy'],
    },
    address: {
      type: AddressSchema,
    },
    someMixed: {
      type: Schema.Types.Mixed,
      description: 'Some dynamic data',
    },
    salaryDecimal: {
      type: Schema.Types.Decimal128,
      index: true,
    },
  },
  {
    collection: 'user_users',
  }
);

UserSchema.index({ gender: 1, age: -1 });

export const User = model('User', UserSchema);
