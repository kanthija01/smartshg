const Scheme = require('../models/Scheme');

// @desc    List curated government schemes with category filter & search
// @route   GET /api/schemes
const listSchemes = async (req, res, next) => {
  try {
    const { category, search, lang = 'en' } = req.query;

    const filter = { activeStatus: true };
    if (category && category !== 'ALL') {
      filter.category = category;
    }

    const schemes = await Scheme.find(filter).sort({ createdAt: -1 });

    let filtered = schemes;
    if (search) {
      const s = search.toLowerCase();
      filtered = schemes.filter(
        (sc) =>
          sc.title.en.toLowerCase().includes(s) ||
          sc.title.te.includes(s) ||
          sc.shortSummary.en.toLowerCase().includes(s) ||
          sc.category.toLowerCase().includes(s)
      );
    }

    res.json({
      success: true,
      count: filtered.length,
      disclaimer:
        'Scheme information may change. Please verify eligibility and application details on the official source before applying.',
      disclaimerTe:
        'పథకాల సమాచారం మారవచ్చు. దరఖాస్తు చేయడానికి ముందు అధికారిక వెబ్‌సైట్ లేదా కార్యాలయంలో అర్హత మరియు వివరాలను ధృవీకరించుకోండి.',
      schemes: filtered,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single scheme details
// @route   GET /api/schemes/:id
const getSchemeDetails = async (req, res, next) => {
  try {
    const scheme = await Scheme.findById(req.params.id);
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found.' });
    }

    res.json({
      success: true,
      scheme,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listSchemes,
  getSchemeDetails,
};
