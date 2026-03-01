export { wordpressCreatePostNode } from './createPost.js'
export { wordpressUpdatePostNode } from './updatePost.js'
export { wordpressGetPostsNode } from './getPosts.js'
export { wordpressCredential } from './credentials.js'
export {
  WordPressPostSchema,
  WordPressCreatePostInputSchema,
  WordPressCreatePostOutputSchema,
  WordPressUpdatePostInputSchema,
  WordPressUpdatePostOutputSchema,
  WordPressGetPostsInputSchema,
  WordPressGetPostsOutputSchema,
  normalizeWordPressPost,
} from './schemas.js'
export type {
  WordPressPost,
  WordPressCreatePostInput,
  WordPressCreatePostOutput,
  WordPressUpdatePostInput,
  WordPressUpdatePostOutput,
  WordPressGetPostsInput,
  WordPressGetPostsOutput,
} from './schemas.js'
