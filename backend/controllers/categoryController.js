// backend/controllers/categoryController.js
import Category from '../models/Category.js';
import Job from '../models/Job.js'; // Assuming Job model exists and has a 'category' field

export const getCategoriesWithStats = async (req, res) => {
  try {
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: 'jobs',       // The name of your jobs collection in MongoDB (usually lowercase plural)
          localField: '_id',  // The _id field in the Category collection
          foreignField: 'category', // The field in the Job collection that references the Category
          as: 'jobs'
        }
      },
      {
        $project: {
          name: 1,            // Include category name
          image: 1,           // Assuming category has an image field
          // Include other category fields as needed
          jobCount: { $size: '$jobs' } // Calculate the size of the joined jobs array
        }
      }
    ]);

    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
