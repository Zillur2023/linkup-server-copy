import httpStatus from "http-status"
import catchAsync from "../../utils/catchAsync"
import sendResponse from "../../utils/sendResponse"
import { CommentServices } from "./comment.service"


const createComment = catchAsync(async (req, res) => {
    const result = await CommentServices.createCommentIntoDB(req.body)
  
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Create comment successfully',
        data: result
    })
  })
const getAllComment = catchAsync(async (req, res) => {
    const {postId} = req.params
    const result = await CommentServices.getAllCommentFromDB(postId)
  
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Get all comment successfully',
        data: result
    })
  })
const updateComment = catchAsync(async (req, res) => {
    const result = await CommentServices.updateCommentIntoDB(req.body)
  
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Update comment successfully',
        data: result
    })
  })
const deleteComment = catchAsync(async (req, res) => {
   const {commentId} = req.params
    const result = await CommentServices.deleteCommentIntoDB(commentId)
  
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Delete comment successfully',
        data: result
    })
  })

  export const CommentControllers = {
    createComment,
    getAllComment,
    updateComment,
    deleteComment
  }