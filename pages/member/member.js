const store = require('../../utils/store');

const emptyForm = {
  id: '',
  name: '',
  gender: 'MALE',
  birthday: '1990-01-01',
  heightCm: '',
  targetWeightKg: '',
  isDefault: false
};

Page({
  data: {
    members: [],
    currentMemberId: '',
    form: { ...emptyForm },
    genderOptions: ['男', '女'],
    genderValues: ['MALE', 'FEMALE'],
    genderIndex: 0,
    editing: false
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const members = store.getMembers();
    const current = store.getCurrentMember();
    this.setData({
      members,
      currentMemberId: current ? current.id : ''
    });
  },

  newMember() {
    this.setData({
      form: { ...emptyForm, birthday: '1990-01-01' },
      genderIndex: 0,
      editing: false
    });
  },

  editMember(event) {
    const id = event.currentTarget.dataset.id;
    const member = this.data.members.find((item) => item.id === id);
    if (!member) {
      return;
    }
    const genderIndex = member.gender === 'FEMALE' ? 1 : 0;
    this.setData({
      form: { ...member },
      genderIndex,
      editing: true
    });
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      form: {
        ...this.data.form,
        [field]: event.detail.value
      }
    });
  },

  onGenderChange(event) {
    const genderIndex = Number(event.detail.value);
    this.setData({
      genderIndex,
      form: {
        ...this.data.form,
        gender: this.data.genderValues[genderIndex]
      }
    });
  },

  onBirthdayChange(event) {
    this.setData({
      form: {
        ...this.data.form,
        birthday: event.detail.value
      }
    });
  },

  saveForm() {
    const form = this.data.form;
    if (!form.name || !form.gender || !form.birthday || !form.heightCm) {
      wx.showToast({ title: '请填写必填字段', icon: 'none' });
      return;
    }

    const saved = store.saveMember({
      ...form,
      heightCm: Number(form.heightCm),
      targetWeightKg: Number(form.targetWeightKg || 0)
    });
    store.setCurrentMemberId(saved.id);
    this.refresh();
    this.newMember();
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  setDefault(event) {
    const id = event.currentTarget.dataset.id;
    const member = this.data.members.find((item) => item.id === id);
    if (!member) {
      return;
    }
    store.saveMember({ ...member, isDefault: true });
    store.setCurrentMemberId(id);
    this.refresh();
  },

  deleteMember(event) {
    const id = event.currentTarget.dataset.id;
    const member = this.data.members.find((item) => item.id === id);
    if (!member) {
      return;
    }
    if (this.data.members.length <= 1) {
      wx.showToast({ title: '至少保留一个成员', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '删除成员',
      content: `确认删除 ${member.name}？历史记录会保留但不再默认展示。`,
      success: (result) => {
        if (result.confirm) {
          store.deleteMember(id);
          this.refresh();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  }
});
