const { Complaint, User, Notification, ActivityLog, MembershipApplication } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const emailService = require('../services/emailService');

// Helper to generate tracking ID
const generateTrackingId = () => {
    return 'CMP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
};

exports.createComplaint = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, category, priority, attachment_url } = req.body;
        const userId = req.user.id;
        // User table doesn't have name/email, fetch from membership application
        const userName = req.user.membershipApplication?.name || 'Unknown User';
        const userEmail = req.user.membershipApplication?.email || 'No Email';
        const userPsn = req.user.membershipApplication?.psn || null;

        const uploaded = req.file || null;
        const storedAttachmentUrl = uploaded ? `/uploads/${uploaded.filename}` : null;

        const trackingId = generateTrackingId();

        const complaint = await Complaint.create({
            tracking_id: trackingId,
            user_id: userId,
            user_psn: userPsn,
            title,
            description,
            category,
            priority,
            attachment_url: storedAttachmentUrl || attachment_url || null,
            status: 'pending'
        });

        // Log activity
        await ActivityLog.logActivity(req.user, 'CREATE_COMPLAINT', 'Complaint', complaint.id, `Created complaint ${trackingId}`, null, req);

        // Notify Admins (Assuming role 'admin' exists)
        // In a real scenario, we might want to find all admins. For now, we'll skip direct admin notification logic here
        // or implement a broadcast to admins if that feature exists.
        // Alternatively, create a notification for a generic "Admin" user if one exists, or just log it.
        // For now, we confirm to the user.

        await Notification.create({
            user_id: userId,
            type: 'complaint_received',
            title: 'Complaint Received',
            message: `Your complaint has been received. Tracking ID: ${trackingId}. We will get back to you shortly.`,
            is_read: false
        });

        // Send Email Confirmation
        try {
             await emailService.sendComplaintConfirmationEmail(req.user, {
                 ticketId: complaint.tracking_id,
                 category: complaint.category,
                 priority: complaint.priority,
                 description: complaint.description
             });
        } catch (emailError) {
             console.error('Failed to send complaint confirmation email:', emailError);
        }

        // Notify Admins
        try {
            const admins = await User.findAll({ 
                where: { 
                    role: { [Op.in]: ['admin', 'secretary', 'chairman'] } 
                },
                attributes: ['id'],
                include: [{
                    model: MembershipApplication,
                    as: 'membershipApplication',
                    attributes: ['name', 'email']
                }]
            });

            for (const admin of admins) {
                // In-app notification
                await Notification.create({
                    user_id: admin.id,
                    type: 'new_complaint',
                    title: 'New Complaint Received',
                    message: `New complaint from ${userName}: ${title} (${trackingId})`,
                    is_read: false
                });

                // Email notification
                try {
                    await emailService.sendNewComplaintAlertToAdmin(admin, complaint, req.user);
                } catch (err) {
                    console.error(`Failed to email admin ${admin.membershipApplication?.email}:`, err);
                }
            }
        } catch (error) {
            console.error('Error notifying admins:', error);
        }

        res.status(201).json({
            message: 'Complaint submitted successfully',
            complaint
        });

    } catch (error) {
        console.error('Error creating complaint:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getComplaints = async (req, res) => {
    try {
        const { status, category, priority, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        const where = {};
        
        // If not admin/secretary, can only see own complaints
        if (!['admin', 'secretary', 'chairman'].includes(req.user.role)) {
            where.user_id = req.user.id;
        }

        if (status) where.status = status;
        if (category) where.category = category;
        if (priority) where.priority = priority;

        const { count, rows } = await Complaint.findAndCountAll({
            where,
            include: [
                { 
                    model: User, 
                    as: 'user', 
                    attributes: ['id'],
                    include: [{
                        model: MembershipApplication,
                        as: 'membershipApplication',
                        attributes: ['name', 'email']
                    }]
                },
                { 
                    model: User, 
                    as: 'assignedTo', 
                    attributes: ['id'],
                    include: [{
                        model: MembershipApplication,
                        as: 'membershipApplication',
                        attributes: ['name']
                    }]
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // Map results to flatten user details for frontend compatibility
        const formattedComplaints = rows.map(complaint => {
            const plainComplaint = complaint.get({ plain: true });
            if (plainComplaint.user && plainComplaint.user.membershipApplication) {
                plainComplaint.user.name = plainComplaint.user.membershipApplication.name;
                // Prefer membership email over user table email (though they should be same/synced)
                plainComplaint.user.email = plainComplaint.user.membershipApplication.email;
                delete plainComplaint.user.membershipApplication;
            }
            if (plainComplaint.assignedTo && plainComplaint.assignedTo.membershipApplication) {
                plainComplaint.assignedTo.name = plainComplaint.assignedTo.membershipApplication.name;
                delete plainComplaint.assignedTo.membershipApplication;
            }
            return plainComplaint;
        });

        res.json({
            complaints: formattedComplaints,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            totalComplaints: count
        });

    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getComplaintById = async (req, res) => {
    try {
        const { id } = req.params;
        const complaint = await Complaint.findByPk(id, {
            include: [
                { 
                    model: User, 
                    as: 'user', 
                    attributes: ['id'],
                    include: [{
                        model: MembershipApplication,
                        as: 'membershipApplication',
                        attributes: ['name', 'email']
                    }]
                },
                { 
                    model: User, 
                    as: 'assignedTo', 
                    attributes: ['id'],
                    include: [{
                        model: MembershipApplication,
                        as: 'membershipApplication',
                        attributes: ['name']
                    }]
                }
            ]
        });

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        // Access control
        if (!['admin', 'secretary', 'chairman'].includes(req.user.role) && complaint.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Format for frontend
        const plainComplaint = complaint.get({ plain: true });
        if (plainComplaint.user && plainComplaint.user.membershipApplication) {
            plainComplaint.user.name = plainComplaint.user.membershipApplication.name;
            plainComplaint.user.email = plainComplaint.user.membershipApplication.email;
            delete plainComplaint.user.membershipApplication;
        }
        if (plainComplaint.assignedTo && plainComplaint.assignedTo.membershipApplication) {
            plainComplaint.assignedTo.name = plainComplaint.assignedTo.membershipApplication.name;
            delete plainComplaint.assignedTo.membershipApplication;
        }

        res.json(plainComplaint);
    } catch (error) {
        console.error('Error fetching complaint:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assigned_to, resolution_notes, internal_notes } = req.body;

        const complaint = await Complaint.findByPk(id, {
            include: [{ model: User, as: 'user', attributes: ['id'] }]
        });

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        // Only admins can update status/assign/resolve
        if (!['admin', 'secretary', 'chairman'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only admins can update complaint status' });
        }

        const updates = {};
        if (status) updates.status = status;
        if (assigned_to) updates.assigned_to = assigned_to;
        if (resolution_notes) updates.resolution_notes = resolution_notes;
        if (internal_notes) updates.internal_notes = internal_notes;

        await complaint.update(updates);

        // Log activity
        await ActivityLog.logActivity(req.user, 'UPDATE_COMPLAINT', 'Complaint', complaint.id, `Updated complaint ${complaint.tracking_id} status to ${status || complaint.status}`, null, req);

        // Notify User
        if (status || resolution_notes) {
            await Notification.create({
                user_id: complaint.user_id,
                type: 'complaint_update',
                title: 'Complaint Update',
                message: `Your complaint (${complaint.tracking_id}) has been updated. Status: ${complaint.status}. ${resolution_notes ? 'Notes added.' : ''}`,
                is_read: false
            });

            // Send Email Notification
            if (complaint.user) {
                try {
                    await emailService.sendComplaintUpdateEmail(complaint.user, complaint);
                } catch (emailError) {
                    console.error('Failed to send complaint update email:', emailError);
                }
            }
        }

        res.json({ message: 'Complaint updated', complaint });

    } catch (error) {
        console.error('Error updating complaint:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.bulkAction = async (req, res) => {
    try {
        const { ids, action, data } = req.body;
        
        if (!['admin', 'secretary', 'chairman'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No complaint IDs provided' });
        }

        if (action === 'update_status') {
            await Complaint.update({ status: data.status }, {
                where: { id: { [Op.in]: ids } }
            });
            await ActivityLog.logActivity(req.user, 'BULK_UPDATE_COMPLAINT', 'Complaint', null, `Bulk updated status for ${ids.length} complaints to ${data.status}`, null, req);
        } else if (action === 'assign') {
            await Complaint.update({ assigned_to: data.assigned_to }, {
                where: { id: { [Op.in]: ids } }
            });
            await ActivityLog.logActivity(req.user, 'BULK_ASSIGN_COMPLAINT', 'Complaint', null, `Bulk assigned ${ids.length} complaints to user ${data.assigned_to}`, null, req);
        } else if (action === 'delete') {
            await Complaint.destroy({
                where: { id: { [Op.in]: ids } }
            });
            await ActivityLog.logActivity(req.user, 'BULK_DELETE_COMPLAINT', 'Complaint', null, `Bulk deleted ${ids.length} complaints`, null, req);
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        res.json({ message: 'Bulk action completed successfully' });
    } catch (error) {
        console.error('Error performing bulk action:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getStats = async (req, res) => {
    try {
        if (!['admin', 'secretary', 'chairman'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const total = await Complaint.count();
        const pending = await Complaint.count({ where: { status: 'pending' } });
        const resolved = await Complaint.count({ where: { status: 'resolved' } });
        const inProgress = await Complaint.count({ where: { status: 'in_progress' } });

        res.json({
            total,
            pending,
            resolved,
            inProgress
        });
    } catch (error) {
        console.error('Error getting complaint stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
