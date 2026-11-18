const { model, Schema } = require('mongoose');

const LanguagesSchema = new Schema(
  {
    language: String,
    skill: {
      type: String,
      enum: ['basic', 'fluent', 'native'],
    },
  },
  {
    _id: false,
  },
);

const AddressSchema = new Schema({
  street: String,
  geo: {
    type: [Number],
    index: '2dsphere',
  },
});

const UserSchema = new Schema(
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
      type: [LanguagesSchema],
      default: [],
    },
    contacts: {
      email: String,
      phones: [String],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'not-specified'],
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
  },
);

UserSchema.index({ gender: 1, age: -1 });

const User = model('User', UserSchema);
module.exports = {
  User,
};
