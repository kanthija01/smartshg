const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
    },
    meetingDate: {
      type: Date,
      required: [true, 'Meeting date is required'],
      index: true,
    },
    time: {
      type: String,
      required: [true, 'Meeting time is required'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    agenda: {
      type: String,
      required: [true, 'Agenda is required'],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    actionItems: [
      {
        task: String,
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
        dueDate: Date,
        completed: { type: Boolean, default: false },
      },
    ],
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

meetingSchema.index({ groupId: 1, meetingDate: -1 });

module.exports = mongoose.model('Meeting', meetingSchema);
