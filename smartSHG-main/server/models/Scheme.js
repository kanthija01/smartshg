const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema(
  {
    title: {
      en: { type: String, required: true, trim: true },
      te: { type: String, required: true, trim: true },
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'SHG_SUPPORT',
        'WOMEN_EMPOWERMENT',
        'LIVELIHOOD',
        'SKILL_DEVELOPMENT',
        'AGRICULTURE',
        'MICROENTERPRISE',
        'LOANS',
        'SUBSIDIES',
        'INSURANCE',
        'PENSION',
        'EDUCATION',
        'HEALTH',
        'HOUSING',
        'FINANCIAL_INCLUSION',
      ],
      index: true,
    },
    shortSummary: {
      en: { type: String, required: true },
      te: { type: String, required: true },
    },
    description: {
      en: { type: String, required: true },
      te: { type: String, required: true },
    },
    eligibility: {
      en: [{ type: String }],
      te: [{ type: String }],
    },
    benefits: {
      en: [{ type: String }],
      te: [{ type: String }],
    },
    requiredDocuments: {
      en: [{ type: String }],
      te: [{ type: String }],
    },
    howToApply: {
      en: { type: String, required: true },
      te: { type: String, required: true },
    },
    officialSource: {
      type: String,
      required: true,
      trim: true,
    },
    stateApplicability: {
      type: String,
      default: 'Andhra Pradesh & Telangana / All India',
      trim: true,
    },
    lastVerifiedDate: {
      type: Date,
      default: Date.now,
    },
    activeStatus: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

schemeSchema.pre('save', function (next) {
  if (!this.slug && this.title.en) {
    this.slug = this.title.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

module.exports = mongoose.model('Scheme', schemeSchema);
