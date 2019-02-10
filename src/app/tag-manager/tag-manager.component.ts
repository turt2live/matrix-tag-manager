import { Component, OnInit } from '@angular/core';
import { MatrixAuthService } from "../matrix-auth.service";
import { MatrixRoomsService } from "../matrix-rooms.service";
import { MatrixRoom } from "../matrix-room";

const FAKE_TAG_DIRECT = "fake.direct";
const FAKE_TAG_RECENTS = "fake.recents";

@Component({
    selector: 'app-tag-manager',
    templateUrl: './tag-manager.component.html',
    styleUrls: ['./tag-manager.component.scss']
})
export class TagManagerComponent implements OnInit {

    public userId: string;
    public loadingRooms = true;
    public newTagName: string;
    public isSaving = false;

    public tags: { [tagName: string]: MatrixRoom[] } = {
        "Favourites": [],
        "Direct Chats": [],
        "Default": [],
        "Low Priority": [],
    };

    public originalTags: { [tagName: string]: MatrixRoom[] } = {};

    public get tagNames(): string[] {
        return Object.keys(this.tags);
    }

    constructor(private auth: MatrixAuthService, private rooms: MatrixRoomsService) {
    }

    public ngOnInit() {
        this.auth.loginState.subscribe(loginState => {
            this.userId = loginState.userId;
        });
        this.rooms.getRooms().subscribe(async (joinedRooms) => {
            const additionalRooms = await this.rooms.getJoinedRooms().toPromise();
            for (const roomId of additionalRooms) {
                if (!joinedRooms[roomId]) joinedRooms[roomId] = {displayName: null, avatarMxc: null, roomId};
            }
            this.rooms.getTags().subscribe(tags => {
                const sortedRoomIds = [];
                for (const tagName of Object.keys(tags)) {
                    let adjustedTagName = this.translateAdjustedToTag(tagName);

                    if (!this.tags[adjustedTagName]) this.tags[adjustedTagName] = [];
                    tags[tagName].map(taggedRoom => {
                        let room = joinedRooms[taggedRoom.roomId];
                        if (!room) room = {displayName: null, avatarMxc: null, roomId: taggedRoom.roomId};
                        this.tags[adjustedTagName].push(room);
                        sortedRoomIds.push(taggedRoom.roomId);
                    });
                }

                this.rooms.getDirectChats().subscribe(chats => {
                    const directChatRoomIds = [];
                    for (const userId of Object.keys(chats)) directChatRoomIds.push(...chats[userId]);

                    for (const roomId of directChatRoomIds) {
                        let room = joinedRooms[roomId];
                        if (!room) {
                            console.warn(`Ignoring unknown direct chat: ${roomId}`);
                            continue;
                        }
                        this.tags["Direct Chats"].push(room);
                        sortedRoomIds.push(roomId);
                    }

                    Object.keys(joinedRooms).filter(rid => !sortedRoomIds.includes(rid)).map(rid => {
                        const room = joinedRooms[rid];
                        this.tags["Default"].push(room);
                    });

                    this.originalTags = {};
                    for (const tid of Object.keys(this.tags)) {
                        this.originalTags[tid] = this.tags[tid].map(r => r); // clone
                    }

                    this.loadingRooms = false;
                });
            });
        });
    }

    private translateTagToAdjusted(tagName: string): string {
        if (tagName === 'Favourites') return 'm.favourite';
        if (tagName === 'Direct Chats') return FAKE_TAG_DIRECT;
        if (tagName === 'Default') return FAKE_TAG_RECENTS;
        if (tagName === 'Low Priority') return 'm.lowpriority';

        return tagName;
    }

    private translateAdjustedToTag(adjustedTagName: string): string {
        if (adjustedTagName === 'm.favourite') return 'Favourites';
        if (adjustedTagName === FAKE_TAG_DIRECT) return 'Direct Chats';
        if (adjustedTagName === FAKE_TAG_RECENTS) return 'Default';
        if (adjustedTagName === 'm.lowpriority') return 'Low Priority';

        return adjustedTagName;
    }

    public isListChanged(tagName: string): boolean {
        const originalList = this.originalTags[tagName];
        const newList = this.tags[tagName];

        if (!originalList || !newList) return false;

        if (originalList.filter(i => !newList.includes(i)).length > 0) return true;
        if (newList.filter(i => !originalList.includes(i)).length > 0) return true;

        for (const room of newList) {
            const idxA = originalList.indexOf(room);
            const idxB = newList.indexOf(room);
            if (idxA !== idxB) return true;
        }

        return false;
    }

    public async saveDirectChats() {
        const knownDirectChatIds = this.tags['Direct Chats'].map(r => r.roomId);
        const legacyDirectChatIds = this.originalTags['Direct Chats']
            .map(r => r.roomId)
            .filter(rid => !knownDirectChatIds.includes(rid));

        try {
            const directChatMap = await this.rooms.getDirectChats().toPromise();

            // First untag all the rooms we want to untag
            console.log(`Untagging ${legacyDirectChatIds.length} rooms from direct chat map`);
            for (const userId of Object.keys(directChatMap)) {
                const rooms = directChatMap[userId];
                for (const roomId of legacyDirectChatIds) {
                    console.log(`Removing ${roomId} from direct chats with ${userId}`);
                    const idx = rooms.indexOf(roomId);
                    if (idx !== -1) rooms.splice(idx, 1);
                }
            }

            // Slot in the new tags and clean up mismatches
            console.log(`Updating ${knownDirectChatIds.length} rooms in direct chat map`);
            for (const roomId of knownDirectChatIds) {
                let joinedMembers = await this.rooms.getEffectiveJoinedMembers(roomId).toPromise();

                // Our own user shouldn't normally appear in the direct chats
                joinedMembers = joinedMembers.filter(u => u !== this.userId);

                // Special case: if we're going to end up with no members, use ourselves
                if (joinedMembers.length === 0) {
                    joinedMembers = [this.userId];
                }

                for (const userId of Object.keys(directChatMap)) {
                    const rooms = directChatMap[userId];
                    if (rooms.includes(roomId) && !joinedMembers.includes(userId)) {
                        console.log(`Removing ${roomId} from direct chats with ${userId} because of mismatch`);
                        rooms.splice(rooms.indexOf(roomId), 1);
                    } else if (!rooms.includes(roomId) && joinedMembers.includes(userId)) {
                        console.log(`Adding ${roomId} to direct chats with ${userId}`);
                        rooms.push(roomId);
                    }
                }

                for (const userId of joinedMembers) {
                    let rooms = directChatMap[userId];
                    if (!rooms) {
                        directChatMap[userId] = rooms = [];
                    }
                    if (!rooms.includes(roomId)) {
                        console.log(`Adding ${roomId} to direct chats with ${userId} (new)`);
                        rooms.push(roomId);
                    }
                }
            }

            // Clean up empty entries
            const allUserIds = Object.keys(directChatMap).map(u => u); // clone
            for (const userId of allUserIds) {
                const rooms = directChatMap[userId];
                if (!rooms || rooms.length <= 0) {
                    console.log(`Removing ${userId} from direct chats map because there are no entries`);
                    delete directChatMap[userId];
                }
            }

            console.log("Saving direct chat map...");
            await this.rooms.setDirectChats(directChatMap).toPromise();

            this.isSaving = false;
            this.originalTags["Direct Chats"] = this.tags["Direct Chats"].map(r => r); // clone
        } catch (e) {
            console.error("Failed to set direct chats");
            console.error(e);
            this.isSaving = false;
            // TODO: Dialog or toast or something
        }
    }

    public async saveTag(tagName: string) {
        this.isSaving = true;

        let adjustedTagName = this.translateTagToAdjusted(tagName);
        if (adjustedTagName === FAKE_TAG_DIRECT) {
            return this.saveDirectChats();
        }

        // Re-scale the order so that we don't end up with infinitely small values
        const roomIds = this.tags[tagName].map(r => r.roomId);
        const increment = 1.0 / roomIds.length;

        for (const roomId of roomIds) {
            try {
                console.log(`Getting tags for ${roomId}`);
                const currentTags = await this.rooms.getTagsOnRoom(roomId).toPromise();
                console.log(currentTags);
                const toDelete = Object.keys(currentTags).filter(i => i !== adjustedTagName);

                if (adjustedTagName !== FAKE_TAG_RECENTS) {
                    const order = increment * roomIds.indexOf(roomId);
                    console.log(`Adding '${adjustedTagName}' to ${roomId} at ${order}`);
                    await this.rooms.addTagToRoom(roomId, adjustedTagName, order).toPromise();
                }

                console.log(`Removing ${toDelete.length} old tags from ${roomId}`);
                for (const oldTag of toDelete) {
                    console.log(`Removing '${oldTag}' from ${roomId}`);
                    await this.rooms.removeTagFromRoom(roomId, oldTag).toPromise();

                    // Remove the tag from the original tag list because the user has already moved it
                    const oldTagList = this.originalTags[this.translateAdjustedToTag(oldTag)];
                    if (oldTagList) {
                        const idx = oldTagList.findIndex(r => r.roomId === roomId);
                        if (idx !== -1) {
                            console.log(`Removing ${roomId} from original ${oldTag}`);
                            oldTagList.splice(idx, 1);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to set tag");
                console.error(e);
                // TODO: Dialog or toast or something
            }
        }

        // Untag any rooms not currently in the list (but were previously)
        const oldRoomIds = this.originalTags[tagName]
            .map(r => r.roomId)
            .filter(rid => !roomIds.includes(rid));
        console.log(`Untagging ${oldRoomIds.length} from old tag lists`);
        for (const oldRoomId of oldRoomIds) {
            try {
                console.log(`Untagging ${oldRoomId}`);
                await this.rooms.removeTagFromRoom(oldRoomId, tagName).toPromise();

                const idx = this.originalTags[tagName].findIndex(i => i.roomId === oldRoomId);
                this.originalTags[tagName].splice(idx, 1);
            } catch (e) {
                console.error("Failed to set tag");
                console.error(e);
                // TODO: Dialog or toast or something
            }
        }

        this.isSaving = false;
        this.originalTags[tagName] = this.tags[tagName].map(r => r); // clone the list
    }

    public logout() {
        this.auth.logout();
    }

    public addTag() {
        this.tags[this.newTagName] = [];
        this.originalTags[this.newTagName] = [];
        this.newTagName = "";
    }
}
