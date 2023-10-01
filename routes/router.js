const router = require('express').Router();

const database = include('databaseConnectionMongoDB');
var ObjectId = require('mongodb').ObjectId;

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const passwordPepper = "SeCretPeppa4MySal+";

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;

const cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET
});

const multer  = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const mongodb_database = process.env.REMOTE_MONGODB_DATABASE;
const userCollection = database.db(mongodb_database).collection('users');
const petCollection = database.db(mongodb_database).collection('pets');
const mediaCollection = database.db(mongodb_database).collection('media');
const countersCollection = database.db(mongodb_database).collection('counters');

const Joi = require("joi");
const mongoSanitize = require('express-mongo-sanitize');

router.use(mongoSanitize(
    {replaceWith: '%'}
));

router.get('/', async (req, res) => {
	console.log("page hit");


	try {
		const users = await userCollection.find().project({first_name: 1, last_name: 1, email: 1, _id: 1}).toArray();

		if (users === null) {
			res.render('error', {message: 'Error connecting to MongoDB'});
			console.log("Error connecting to user collection");
		}
		else {
			users.map((item) => {
				item.user_id = item._id;
				return item;
			});
			console.log(users);

			res.render('index', {allUsers: users});
		}
	}
	catch(ex) {
		res.render('error', {message: 'Error connecting to MySQL'});
		console.log("Error connecting to MySQL");
		console.log(ex);
	}
});

router.get('/pic', async (req, res) => {
	  res.send('<form action="picUpload" method="post" enctype="multipart/form-data">'
    + '<p>Public ID: <input type="text" name="title"/></p>'
    + '<p>Image: <input type="file" name="image"/></p>'
    + '<p><input type="submit" value="Upload"/></p>'
    + '</form>');
});

router.post('/picUpload', upload.single('image'), function(req, res, next) {
	let buf64 = req.file.buffer.toString('base64');
  stream = cloudinary.uploader.upload("data:image/png;base64," + buf64, function(result) { //_stream
    console.log(result);
    res.send('Done:<br/> <img src="' + result.url + '"/><br/>' +
             cloudinary.image(result.public_id, { format: "png", width: 100, height: 130, crop: "fit" }));
  }, { public_id: req.body.title } );
  console.log(req.body);
  console.log(req.file);

});

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

router.post('/setPetPic', upload.single('image'), function(req, res, next) {
	let image_uuid = uuid();
	let pet_id = req.body.pet_id;
	let user_id = req.body.user_id;
	let buf64 = req.file.buffer.toString('base64');
	stream = cloudinary.uploader.upload("data:image/octet-stream;base64," + buf64, async function(result) { 
			try {
				console.log(result);

				console.log("userId: "+user_id);


				// Joi validate
				const schema = Joi.object(
				{
					pet_id: Joi.string().alphanum().min(24).max(24).required(),
					user_id: Joi.string().alphanum().min(24).max(24).required()
				});
			
				const validationResult = schema.validate({pet_id, user_id});
				if (validationResult.error != null) {
					console.log(validationResult.error);

					res.render('error', {message: 'Invalid pet_id or user_id'});
					return;
				}				
				const success = await petCollection.updateOne({"_id": new ObjectId(pet_id)},
					{$set: {image_id: image_uuid}},
					{}
				);

				if (!success) {
					res.render('error', {message: 'Error uploading pet image to MongoDB'});
					console.log("Error uploading pet image");
				}
				else {
					res.redirect(`/showPets?id=${user_id}`);
				}
			}
			catch(ex) {
				res.render('error', {message: 'Error connecting to MongoDB'});
				console.log("Error connecting to MongoDB");
				console.log(ex);
			}
		}, 
		{ public_id: image_uuid }
	);
	console.log(req.body);
	console.log(req.file);
});


router.get('/showPets', async (req, res) => {
	console.log("page hit");
	try {
		let user_id = req.query.id;
		console.log("userId: "+user_id);

		// Joi validate
		const schema = Joi.object(
			{
				user_id: Joi.string().alphanum().min(24).max(24).required()
			});
		
		const validationResult = schema.validate({user_id});
		if (validationResult.error != null) {
			console.log(validationResult.error);

			res.render('error', {message: 'Invalid user_id'});
			return;
		}				
		const pets = await petCollection.find({"user_id": new ObjectId(user_id)}).toArray();

		if (pets === null) {
			res.render('error', {message: 'Error connecting to MongoDB'});
			console.log("Error connecting to userModel");
		}
		else {
			pets.map((item) => {
				item.pet_id = item._id;
				return item;
			});			
			console.log(pets);
			res.render('pets', {allPets: pets, user_id: user_id});
		}
	}
	catch(ex) {
		res.render('error', {message: 'Error connecting to MongoDB'});
		console.log("Error connecting to MongoDB");
		console.log(ex);
	}
});

router.get('/deleteUser', async (req, res) => {
	try {
		console.log("delete user");

		let user_id = req.query.id;

		const schema = Joi.object(
			{
				user_id: Joi.string().alphanum().min(24).max(24).required()
			});
		
		const validationResult = schema.validate({user_id});
		if (validationResult.error != null) {
			console.log(validationResult.error);

			res.render('error', {message: 'Invalid user_id'});
			return;
		}				

		if (user_id) {
			console.log("userId: "+user_id);
			const result1 = await petCollection.deleteMany({"user_id": new ObjectId(user_id)});
			const result2 = await userCollection.deleteOne({"_id": new ObjectId(user_id)});

			console.log("deleteUser: ");
		}
		res.redirect("/");
	}
	catch(ex) {
		res.render('error', {message: 'Error connecting to MongoDB'});
		console.log("Error connecting to MongoDB");
		console.log(ex);	
	}
});

router.get('/deletePetImage', async (req, res) => {
	try {
		console.log("delete pet image");

		let pet_id = req.query.id;
		let user_id = req.query.user;

		const schema = Joi.object(
			{
				user_id: Joi.string().alphanum().min(24).max(24).required(),
				pet_id: Joi.string().alphanum().min(24).max(24).required(),
			});
		
		const validationResult = schema.validate({user_id, pet_id});
		
		if (validationResult.error != null) {
			console.log(validationResult.error);

			res.render('error', {message: 'Invalid user_id or pet_id'});
			return;
		}				

		if (pet_id) {
			console.log("petId: "+pet_id);
			const success = await petCollection.updateOne({"_id": new ObjectId(pet_id)},
				{$set: {image_id: undefined}},
				{}
			);

			console.log("delete Pet Image: ");
			console.log(success);
			if (!success) {
				res.render('error', {message: 'Error connecting to MySQL'});
				return;
			}
		}
		res.redirect(`/showPets?id=${user_id}`);
	}
	catch(ex) {
		res.render('error', {message: 'Error connecting to MySQL'});
		console.log("Error connecting to MySQL");
		console.log(ex);	
	}
});

router.post('/addUser', async (req, res) => {
	try {
		console.log("form submit");

		const password_salt = crypto.createHash('sha512');

		password_salt.update(uuid());
		
		const password_hash = crypto.createHash('sha512');

		password_hash.update(req.body.password+passwordPepper+password_salt);

		const schema = Joi.object(
			{
				first_name: Joi.string().alphanum().min(2).max(50).required(),
				last_name: Joi.string().alphanum().min(2).max(50).required(),
				email: Joi.string().email().min(2).max(150).required()
			});
		
		const validationResult = schema.validate({first_name: req.body.first_name, last_name: req.body.last_name, email: req.body.email});
		
		if (validationResult.error != null) {
			console.log(validationResult.error);

			res.render('error', {message: 'Invalid first_name, last_name, email'});
			return;
		}				

		await userCollection.insertOne(
			{	
				first_name: req.body.first_name,
				last_name: req.body.last_name,
				email: req.body.email,
				password_salt: password_salt.digest('hex'),
				password_hash: password_hash.digest('hex')
			}
		);

		res.redirect("/");
	}
	catch(ex) {
		res.render('error', {message: 'Error connecting to MySQL'});
		console.log("Error connecting to MySQL");
		console.log(ex);	
	}
});


router.post('/addPet', async (req, res) => {
	try {
		console.log("form submit");

		let user_id = req.body.user_id;

		const schema = Joi.object(
			{
				user_id: Joi.string().alphanum().min(24).max(24).required(),
				name: Joi.string().alphanum().min(2).max(50).required(),
				pet_type: Joi.string().alphanum().min(2).max(150).required()
			});
		
		const validationResult = schema.validate({user_id, name: req.body.pet_name, pet_type: req.body.pet_type});
		
		if (validationResult.error != null) {
			console.log(validationResult.error);

			res.render('error', {message: 'Invalid first_name, last_name, email'});
			return;
		}				


		await petCollection.insertOne(
			{	
				name: req.body.pet_name,
				user_id: new ObjectId(user_id),
				pet_type: req.body.pet_type,
			}
		);

		res.redirect(`/showPets?id=${user_id}`);
	}
	catch(ex) {
		res.render('error', {message: 'Error connecting to MySQL'});
		console.log("Error connecting to MySQL");
		console.log(ex);	
	}
});

function createShortUrl(originalUrl) {
  const id = crypto.randomBytes(4).toString('hex');  // Create a random 8-character identifier
  const shortUrl = `https://example.com/${id}`;
  return shortUrl;
}

router.post('/addMedia', async (req, res) => {
  try {
      console.log("form submit");

      let user_id = req.body.user_id;
      let media_type = req.body.media_type;
      let original_link = req.body.original_link;
      let text_content = req.body.text_content;
      let title = req.body.title;
      let active = req.body.active === 'true';
      let url = `https://example.com/${uuidv4()}`;
      let custom_url = req.body.custom_url;

      
      // Create schema for validation
      const schema = Joi.object({
          user_id: Joi.string().alphanum().min(24).max(24).required(),
          media_type: Joi.string().valid('links', 'image', 'text').required(),
          title: Joi.string().min(1).required(),
          shortURL: Joi.string().uri().optional(),
          original_link: Joi.when('media_type', {
              is: 'links',
              then: Joi.string().uri().required(),
              otherwise: Joi.optional()
          }),
          text_content: Joi.when('media_type', {
              is: 'text',
              then: Joi.string().min(1).required(),
              otherwise: Joi.optional()
          }),
          active: Joi.boolean().required(),
          url: Joi.string().uri().required(),
          created: Joi.date(),
          last_hit: Joi.date()
      }).options({ allowUnknown: true });

      // Validate the request data
      const validationResult = schema.validate({
          user_id,
          media_type,
          title,
          original_link,
          text_content,
          active,
          url,
          shortURL: media_type === 'links' ? createShortUrl(original_link) : undefined,
          created: new Date(),
          last_hit: new Date()
      });

      if (validationResult.error != null) {
          console.log(validationResult.error);
          res.render('error', { message: 'Invalid data provided' });
          return;
      }
      // Check if a custom_url is provided
      console.log("run2");
      let shortURL;
      if (custom_url) {
        // Prepend the domain to the custom_url
        shortURL = `https://example.com/${custom_url}`;
      } else {
        // Generate a short URL as before
        shortURL = createShortUrl(original_link);
      }

      
      const existingMediaItem = await mediaCollection.findOne({ shortURL: shortURL });
      if (existingMediaItem) {
        let allMedia = await mediaCollection.find({ user_id: new ObjectId(user_id) }).toArray();
        res.render('media', { error: 'Custom URL already exists', user_id: user_id, allMedia: allMedia });
        return;
      }
    
      

      // Create a document object with common fields
      const document = {
          user_id: new ObjectId(user_id),
          media_type,
          title,
          active,
          url,
          shortURL: shortURL,
          created: new Date(),
          last_hit: new Date(),
          hits: 0
      };

      // Add media-specific fields to the document object
      if (media_type === 'links') {
          document.original_link = original_link;
      } else if (media_type === 'text') {
          document.text_content = text_content;
      }

      console.log("run4");

      

      // MongoDB will automatically create a unique _id for each document
      const result = await mediaCollection.insertOne(document);
      if (media_type === 'text') {
        // Now that the document has been inserted, the _id field has been generated
        // Update the document to set the url field
        const newUrl = `https://example.com/textpage/${result.insertedId}`;
        await mediaCollection.updateOne(
            { _id: result.insertedId },
            { $set: { url: newUrl } }
        );
    }

      res.redirect(`/showMedia?id=${user_id}`);
  } catch (ex) {
      res.render('error', { message: 'Error connecting to MongoDB' });
      console.log("Error connecting to MongoDB");
      console.log(ex);
  }
});



router.get('/media/:id', async (req, res) => {
  try {
      const shortUrl = `https://example.com/${req.params.id}`;
      const mediaItem = await mediaCollection.findOne({ shortURL: shortUrl });
      if (mediaItem && mediaItem.media_type === 'links') {
          await updateLastHit(mediaItem._id.toString());  // Update the last_hit field
          res.redirect(mediaItem.original_link);
      } else {
          res.status(404).send('Not found');
      }
  } catch (ex) {
      res.render('error', { message: 'Error connecting to MongoDB' });
      console.log("Error connecting to MongoDB");
      console.log(ex);
  }
});

async function checkActive(req, res, next) {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
      res.status(400).send('Invalid id format');
      return;
  }
  const mediaItem = await mediaCollection.findOne({ _id: new ObjectId(id) });
  if (mediaItem && mediaItem.active) {
      next();  // Media item is active, proceed to the next middleware
  } else if (mediaItem) {
      // Media item is not active, redirect back to media page
      let allMedia = await mediaCollection.find({ user_id: new ObjectId(mediaItem.user_id) }).toArray();
      res.render('media', { error: 'Link is disabled', user_id: mediaItem.user_id, allMedia: allMedia });
  } else {
      res.status(404).send('Not found');
  }
}


router.get('/redirect/:id', checkActive, async (req, res) => {
  try {
    const id = req.params.id;
    // Validate id format before creating ObjectId
    if (!ObjectId.isValid(id)) {
      res.status(400).send('Invalid id format');
      return;
    }
    // Fetch the media item from the database
    const mediaItem = await mediaCollection.findOne({ _id: new ObjectId(id) });
    if (mediaItem) {
      if (!mediaItem.active) {
        let allMedia = await mediaCollection.find({ user_id: new ObjectId(mediaItem.user_id) }).toArray();
        res.render('media', { error: 'Link is disabled', user_id: mediaItem.user_id, allMedia: allMedia });
        return;
    }
    

      await updateLastHitAndHits(id);  // Update the last_hit and hits fields
      
      if (mediaItem.media_type === 'links') {
        res.redirect(mediaItem.original_link);
      } else if (mediaItem.media_type === 'text') {
        res.render('textPage', { text_content: mediaItem.text_content });
      } else {
        res.status(400).send('Unsupported media type');
      }
    } else {
      res.status(404).send('Not found');
    }
  } catch (ex) {
    res.render('error', { message: 'Error connecting to MongoDB' });
    console.log("Error connecting to MongoDB");
    console.log(ex);
  }
});





async function updateLastHitAndHits(mediaId) {
  try {
      const result = await mediaCollection.updateOne(
          { _id: new ObjectId(mediaId) },
          {
              $set: { last_hit: new Date() },
              $inc: { hits: 1 }  // Increment the hits field by 1
          }
      );
      console.log(`${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`);
  } catch (error) {
      console.error(`An error occurred: ${error}`);
  }
}


// // Define a new route to handle redirection
// router.get('/redirect/:id', async (req, res) => {
//   try {
//       // Extract the mediaId from the request parameters
//       const mediaId = req.params.id;
      
//       // Fetch the media item from the database
//       const mediaItem = await mediaCollection.findOne({ _id: new ObjectId(mediaId) });
      
//       // If the media item was found, redirect to its URL or shortened URL
//       if (mediaItem) {
//           await updateLastHit(mediaId);  // Update the last_hit field
//           const redirectToUrl = mediaItem.shortURL || mediaItem.url;  // Prefer the shortened URL if it's available
//           res.redirect(redirectToUrl);
//       } else {
//           // If the media item was not found, render an error page
//           res.render('error', { message: 'Media item not found' });
//       }
//   } catch (ex) {
//       // Handle any errors that occur
//       res.render('error', { message: 'Error connecting to MongoDB' });
//       console.log("Error connecting to MongoDB");
//       console.log(ex);
//   }
// });




router.get('/showMedia', async (req, res) => {
  console.log("page hit");
  try {
      let user_id = req.query.id;
      console.log("userId: " + user_id);

      // Joi validate
      const schema = Joi.object({
          user_id: Joi.string().alphanum().min(24).max(24).required()
      });

      const validationResult = schema.validate({ user_id });
      if (validationResult.error != null) {
          console.log(validationResult.error);
          res.render('error', { message: 'Invalid user_id' });
          return;
      }

      // Fetch media based on user_id
      const media = await mediaCollection.find({ "user_id": new ObjectId(user_id) }).toArray();
      if (media === null) {
          res.render('error', { message: 'Error connecting to MongoDB' });
          console.log("Error connecting to media collection");
      }
      else {
          console.log(media);
          res.render('media', { allMedia: media, user_id: user_id });  // _id can be accessed directly in your media.ejs file
      }
  }
  catch (ex) {
      res.render('error', { message: 'Error connecting to MongoDB' });
      console.log("Error connecting to MongoDB");
      console.log(ex);
  }
});

router.get('/media/:id', async (req, res) => {
  try {
      const mediaId = req.params.id;
      const mediaItem = await mediaCollection.findOne({ _id: new ObjectId(mediaId) });

      if (mediaItem) {
          if (mediaItem.media_type === 'text') {
              res.render('textPage', { textContent: mediaItem.text_content });
          } else if (mediaItem.media_type === 'links') {
              res.redirect(mediaItem.original_link);
          } else {
              res.render('error', { message: 'Invalid media type' });
          }
      } else {
          res.render('error', { message: 'Media item not found' });
      }
  } catch (ex) {
      res.render('error', { message: 'Error connecting to MongoDB' });
      console.log("Error connecting to MongoDB");
      console.log(ex);
  }
});

router.get('/filter/:mediaType', async (req, res) => {
  try {
    const mediaType = req.params.mediaType;
    const userId = req.query.user_id;  // Get user_id from the query parameters
    const filteredMediaItems = await mediaCollection.find({ media_type: mediaType }).toArray();
    res.render('media', { allMedia: filteredMediaItems, user_id: userId });
  } catch (ex) {
    res.render('error', { message: 'Error filtering media items' });
    console.error('Error filtering media items:', ex);
  }
});


// Assuming you have already defined your Express app and mediaCollection

router.post('/activateMedia', async (req, res) => {
  try {
      const media_id = req.body.media_id;
      const user_id = req.body.user_id;

      // Update the active field of the media item to true
      await mediaCollection.updateOne(
          { _id: new ObjectId(media_id), user_id: new ObjectId(user_id) },
          { $set: { active: true } }
      );

      // Redirect back to the /showMedia page
      res.redirect(`/showMedia?id=${user_id}`);
  } catch (ex) {
      res.render('error', { message: 'Error activating media item' });
      console.log("Error activating media item");
      console.log(ex);
  }
});

router.post('/deactivateMedia', async (req, res) => {
  try {
      const media_id = req.body.media_id;
      const user_id = req.body.user_id;

      // Update the active field of the media item to false
      await mediaCollection.updateOne(
          { _id: new ObjectId(media_id), user_id: new ObjectId(user_id) },
          { $set: { active: false } }
      );

      // Redirect back to the /showMedia page
      res.redirect(`/showMedia?id=${user_id}`);
  } catch (ex) {
      res.render('error', { message: 'Error deactivating media item' });
      console.log("Error deactivating media item");
      console.log(ex);
  }
});


// Route to activate a media item
router.post('/activateMedia', async (req, res) => {
  const mediaId = req.body.media_id;
  await mediaCollection.updateOne({ _id: new ObjectId(mediaId) }, { $set: { active: true } });
  res.redirect(`/showMedia?id=${req.body.user_id}`);
});

// Route to deactivate a media item
router.post('/deactivateMedia', async (req, res) => {
  const mediaId = req.body.media_id;
  await mediaCollection.updateOne({ _id: new ObjectId(mediaId) }, { $set: { active: false } });
  res.redirect(`/showMedia?id=${req.body.user_id}`);
});

router.get('/textpage/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const mediaItem = await mediaCollection.findOne({ _id: new ObjectId(id) });

      if (!mediaItem || mediaItem.media_type !== 'text') {
          res.render('error', { message: 'Invalid media item ID or type' });
          return;
      }

      res.render('textpage', { text_content: mediaItem.text_content });
  } catch (ex) {
      res.render('error', { message: 'Error retrieving text content' });
      console.log("Error retrieving text content:", ex);
  }
});


module.exports = router;
