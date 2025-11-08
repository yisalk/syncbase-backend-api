const User = require('../models/User');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errorHandler');

const createOrUpdateUser = async (userData, planData = null) => {
  try {
    const { email, name, picture, user_metadata = {} } = userData;
    if (!email || !name) {
      throw new ValidationError('Email and name are required');
    }
    let user = await User.findOne({ email });
    if (user) {
      const updateData = {
        name,
        profilePicture: picture,
        updatedAt: new Date()
      };
      if (planData) {
        updateData.planType = planData.planName;
        updateData.selectedPlan = {
          name: planData.planName,
          price: planData.planPrice,
          period: planData.planPeriod
        };
      }
      if (userData.sub && !user.auth0Id) {
        updateData.auth0Id = userData.sub;
      }
      user = await User.findByIdAndUpdate(
        user._id,
        updateData,
        { new: true, runValidators: true }
      );
    } else {
      const newUserData = {
        name,
        email,
        company: user_metadata.company || 'Not specified',
        phone: user_metadata.phone_number || 'Not specified',
        zip: user_metadata.zip || 'Not specified',
        auth0Id: userData.sub,
        profilePicture: picture,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      if (planData) {
        newUserData.planType = planData.planName;
        newUserData.selectedPlan = {
          name: planData.planName,
          price: planData.planPrice,
          period: planData.planPeriod
        };
      }
      user = await User.create(newUserData);
    }
    return user;
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('User with this email already exists');
    }
    throw error;
  }
};

const getUserByEmail = async (email) => {
  if (!email) {
    throw new ValidationError('Email is required');
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};

const getUserById = async (userId) => {
  if (!userId) {
    throw new ValidationError('User ID is required');
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};

const updateUserProfile = async (userId, updateData) => {
  if (!userId) {
    throw new ValidationError('User ID is required');
  }
  const allowedFields = ['name', 'company', 'phone', 'zip'];
  const filteredData = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  }
  filteredData.updatedAt = new Date();
  const user = await User.findByIdAndUpdate(
    userId,
    filteredData,
    { new: true, runValidators: true }
  );
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};

const getUserStats = async (userId) => {
  const user = await getUserById(userId);
  const License = require('../models/License');
  const licenseCount = await License.countDocuments({ userId });
  
  return {
    userId: user._id,
    name: user.name,
    email: user.email,
    company: user.company,
    licenseCount,
    createdAt: user.createdAt,
    lastUpdated: user.updatedAt
  };
};

module.exports = {
  createOrUpdateUser,
  getUserByEmail,
  getUserById,
  updateUserProfile,
  getUserStats
};
